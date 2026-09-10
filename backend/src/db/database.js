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
db.exec(readFileSync(RUTA_SCHEMA, 'utf8'));

if (esBaseNueva) {
  console.log(`  Base de datos creada en: ${RUTA_BD}`);
}

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
