/**
 * Carga de datos de prueba.
 *
 * Uso:  npm run db:seed
 *
 * Vacia las tablas y las vuelve a poblar con el contenido de seed.sql.
 * Pensado para desarrollo: NO debe ejecutarse sobre datos reales.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { db, RUTA_BD, cerrarBaseDatos } from './database.js';

const DIRECTORIO_ACTUAL = dirname(fileURLToPath(import.meta.url));
const RUTA_SEED = resolve(DIRECTORIO_ACTUAL, 'seed.sql');

console.log('');
console.log('  Cargando datos de prueba...');
console.log(`  Base de datos: ${RUTA_BD}`);

try {
  db.exec(readFileSync(RUTA_SEED, 'utf8'));

  // Resumen de lo insertado, para confirmar que todo quedo en su lugar.
  const tablas = ['USUARIO', 'PROYECTO', 'INCIDENCIA', 'HISTORIAL_INCIDENCIA', 'METRICA'];
  console.log('');
  for (const tabla of tablas) {
    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM ${tabla}`).get();
    console.log(`  ${tabla.padEnd(22)} ${String(total).padStart(3)} registros`);
  }

  const { duplicados } = db
    .prepare('SELECT COUNT(*) AS duplicados FROM INCIDENCIA WHERE posible_duplicado_de IS NOT NULL')
    .get();
  const { reaperturas } = db
    .prepare(
      `SELECT COUNT(DISTINCT id_incidencia) AS reaperturas
         FROM HISTORIAL_INCIDENCIA
        WHERE estado_anterior = 'RESUELTA' AND estado_nuevo = 'EN_PROGRESO'`
    )
    .get();

  console.log('');
  console.log(`  Posibles duplicados marcados:  ${duplicados}`);
  console.log(`  Incidencias reabiertas:        ${reaperturas}`);
  console.log('');
  console.log('  Datos de prueba cargados correctamente.');
  console.log('');
} catch (error) {
  console.error('');
  console.error('  Error al cargar los datos de prueba:');
  console.error(`  ${error.message}`);
  console.error('');
  process.exitCode = 1;
} finally {
  cerrarBaseDatos();
}
