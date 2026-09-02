/**
 * Logica de negocio para la verificacion de estado del sistema.
 *
 * Los services son la capa intermedia: el controlador les pide un resultado
 * y ellos deciden como obtenerlo. Es el unico lugar, junto con los models,
 * autorizado a consultar la base de datos.
 */
import { db } from '../db/database.js';

/**
 * Comprueba que la base de datos responde y devuelve un resumen de su contenido.
 * Si la consulta falla, se informa el problema en lugar de dejar caer el servidor.
 */
export function verificarBaseDatos() {
  try {
    const { total: usuarios } = db.prepare('SELECT COUNT(*) AS total FROM USUARIO').get();
    const { total: proyectos } = db.prepare('SELECT COUNT(*) AS total FROM PROYECTO').get();
    const { total: incidencias } = db.prepare('SELECT COUNT(*) AS total FROM INCIDENCIA').get();

    return {
      conectada: true,
      motor: 'SQLite',
      registros: { usuarios, proyectos, incidencias },
    };
  } catch (error) {
    return {
      conectada: false,
      motor: 'SQLite',
      error: error.message,
    };
  }
}
