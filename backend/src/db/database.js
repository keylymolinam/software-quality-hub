/**
 * Conexion a la base de datos SQLite.
 *
 * Este archivo es el UNICO punto del sistema que abre la base de datos.
 * El resto del codigo (los models) importa la constante `db` desde aqui.
 *
 * Se utiliza el modulo `node:sqlite`, integrado en Node.js a partir de la
 * version 22, en lugar de una libreria externa. Ventaja: no requiere compilar
 * codigo nativo, por lo que la instalacion del proyecto no puede fallar por
 * falta de herramientas de compilacion en la maquina.
 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from '../config/env.js';

const DIRECTORIO_ACTUAL = dirname(fileURLToPath(import.meta.url));

// Raiz de la carpeta backend/ (subimos dos niveles desde src/db).
// Se calcula asi para que la ruta de la base de datos no dependa de desde
// que carpeta se ejecute el comando node.
const RAIZ_BACKEND = resolve(DIRECTORIO_ACTUAL, '..', '..');

const RUTA_BD = resolve(RAIZ_BACKEND, config.dbPath);
const RUTA_SCHEMA = resolve(DIRECTORIO_ACTUAL, 'schema.sql');

// Si la carpeta data/ no existe todavia, se crea.
const carpetaDatos = dirname(RUTA_BD);
if (!existsSync(carpetaDatos)) {
  mkdirSync(carpetaDatos, { recursive: true });
}

const esBaseNueva = !existsSync(RUTA_BD);

// Abrir (o crear) el archivo de base de datos.
export const db = new DatabaseSync(RUTA_BD);

// --- Configuracion de la conexion -------------------------------------------

// SQLite NO valida las claves foraneas si no se activa explicitamente.
// Sin esta linea se podrian guardar incidencias apuntando a proyectos
// inexistentes.
db.exec('PRAGMA foreign_keys = ON;');

// WAL (Write-Ahead Logging): permite leer mientras se escribe.
// Evita bloqueos cuando el dashboard consulta metricas al mismo tiempo que
// alguien registra una incidencia.
db.exec('PRAGMA journal_mode = WAL;');

// --- Creacion de las tablas -------------------------------------------------
// El esquema usa CREATE TABLE IF NOT EXISTS, por lo que ejecutarlo en cada
// arranque es seguro: crea lo que falta y no toca lo que ya existe.
const TEXTO_SCHEMA = readFileSync(RUTA_SCHEMA, 'utf8');
db.exec(TEXTO_SCHEMA);

if (esBaseNueva) {
  console.log(`  Base de datos creada en: ${RUTA_BD}`);
}

/**
 * Tablas en orden de dependencia: cada una solo apunta a las que estan antes.
 * Se borran en el orden inverso para no dejar claves foraneas colgando.
 */
const TABLAS = ['USUARIO', 'PROYECTO', 'INCIDENCIA', 'HISTORIAL_INCIDENCIA', 'METRICA'];

/**
 * Borra todas las tablas y las vuelve a crear con el esquema actual.
 *
 * La usa el seed. Existe porque CREATE TABLE IF NOT EXISTS no toca una tabla
 * que ya existe, y SQLite no permite modificar un CHECK con ALTER TABLE: al
 * agregar un estado (VALIDADA), una base creada antes seguiria rechazandolo.
 * Vaciar las tablas con DELETE, como se hacia antes, conservaba ese CHECK
 * viejo. Se descarto una migracion que reconstruya las tablas conservando las
 * filas: aqui solo hay datos de prueba que el seed regenera, y la migracion
 * seria mas codigo que proteger que lo que protege.
 */
export function recrearEsquema() {
  for (const tabla of [...TABLAS].reverse()) {
    db.exec(`DROP TABLE IF EXISTS ${tabla}`);
  }
  db.exec(TEXTO_SCHEMA);
}

/**
 * Avisa al arrancar si la base se creo con una lista de estados anterior.
 *
 * Sin el aviso, el sintoma aparece mucho despues y lejos de la causa: un 500
 * al intentar validar una incidencia, con un "CHECK constraint failed" que no
 * dice que hacer. Solo avisa y no detiene el arranque, porque el remedio
 * (npm run db:seed) tiene que poder abrir esta misma conexion.
 */
function avisarSiElEsquemaQuedoAtras() {
  // Se busca dentro del bloque de INCIDENCIA: PROYECTO tambien tiene una
  // columna estado con su propio CHECK, y aparece antes en el archivo.
  const bloqueIncidencia = TEXTO_SCHEMA.match(/CREATE TABLE IF NOT EXISTS INCIDENCIA \(([\s\S]*?)\n\);/)?.[1];
  const estadosDelSchema = bloqueIncidencia?.match(/CHECK \(estado IN \(([^)]*)\)\)/)?.[1];
  const { sql } =
    db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'INCIDENCIA'").get() ?? {};

  if (!estadosDelSchema || !sql) return;

  const faltantes = estadosDelSchema
    .split(',')
    .map((valor) => valor.trim())
    .filter((valor) => !sql.includes(valor));

  if (faltantes.length > 0) {
    console.warn('');
    console.warn(`  AVISO: la base ${RUTA_BD}`);
    console.warn(`  se creo antes de agregar los estados ${faltantes.join(', ')}.`);
    console.warn('  Ejecuta "npm run db:seed" para recrearla (vacia los datos de prueba).');
    console.warn('');
  }
}

avisarSiElEsquemaQuedoAtras();

/**
 * Fecha y hora actual (UTC) en el mismo formato que usa el esquema:
 * 'YYYY-MM-DD HH:MM:SS'.
 *
 * Se le pregunta a SQLite en vez de usar el reloj de Node para que TODAS las
 * fechas del sistema vengan de la misma fuente. Las columnas fecha_creacion y
 * fecha_cambio ya se llenan con el DEFAULT datetime('now') de la base; si
 * fecha_resolucion se calculara en JavaScript, bastaria una diferencia minima
 * entre ambos relojes para que una incidencia apareciera resuelta antes de
 * haber sido creada, y las metricas de tiempo de resolucion saldrian negativas.
 */
export function ahora() {
  return db.prepare("SELECT datetime('now') AS ahora").get().ahora;
}

/**
 * Ejecuta varias operaciones como una sola unidad indivisible.
 *
 * El problema que resuelve: cambiar el estado de una incidencia son DOS
 * escrituras (actualizar INCIDENCIA y agregar una fila a HISTORIAL_INCIDENCIA).
 * Si la primera funciona y la segunda falla, queda una incidencia RESUELTA sin
 * registro de quien ni cuando la resolvio. Ese dano no se arregla despues, y
 * ademas falsea la tasa de reapertura del indice de salud, que se calcula
 * justamente contando filas del historial.
 *
 * Con una transaccion hay solo dos desenlaces posibles: se guarda todo, o no
 * se guarda nada. Si la funcion lanza un error se deshace lo hecho (ROLLBACK)
 * y el error sigue subiendo hasta el errorHandler.
 *
 *     const resultado = enTransaccion(() => {
 *       Incidencia.actualizar(id, { estado });
 *       Historial.registrar({ ... });
 *       return Incidencia.obtenerPorId(id);
 *     });
 *
 * Vive en este archivo, y no en un service, porque BEGIN/COMMIT/ROLLBACK son
 * asunto de la conexion a la base de datos. Un service lo usa, pero no
 * necesita saber como esta implementado.
 *
 * Nota: si ya hay una transaccion abierta, la funcion se ejecuta dentro de
 * esa transaccion en lugar de abrir otra. SQLite no admite transacciones
 * anidadas, y un BEGIN dentro de otro BEGIN lanzaria un error.
 *
 * @param {Function} operacion  Funcion sincrona con las escrituras.
 * @returns Lo que devuelva `operacion`.
 */
export function enTransaccion(operacion) {
  if (db.isTransaction) {
    return operacion();
  }

  db.exec('BEGIN');

  try {
    const resultado = operacion();
    db.exec('COMMIT');
    return resultado;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error; // se vuelve a lanzar: deshacer no es lo mismo que ocultar
  }
}

/**
 * Cierra la conexion de forma ordenada.
 * Se invoca al detener el servidor para que SQLite consolide el archivo WAL.
 */
export function cerrarBaseDatos() {
  if (db.isOpen) {
    db.close();
  }
}

process.on('SIGINT', () => {
  cerrarBaseDatos();
  process.exit(0);
});

export { RUTA_BD };
