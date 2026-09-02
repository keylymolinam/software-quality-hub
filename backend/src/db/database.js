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
