/**
 * Model de PESO_SALUD: los pesos del indice de salud y su historia.
 *
 * Como HISTORIAL_INCIDENCIA, es una tabla que solo crece. Cambiar los pesos es
 * agregar una fila; los vigentes son los de la ultima. No hay actualizar ni
 * borrar a proposito: si se pudiera reescribir una fila vieja, se perderia lo
 * unico que esta tabla protege, que es poder explicar por que un indice cambio
 * sin que cambiaran las incidencias.
 */
import { db } from '../db/database.js';

const SELECT_BASE = `
  SELECT p.id_peso, p.antiguedad, p.reapertura, p.densidad, p.motivo,
         p.fecha_cambio, p.modificado_por, u.nombre AS modificado_por_nombre
    FROM PESO_SALUD p
    JOIN USUARIO u ON u.id_usuario = p.modificado_por
`;

/**
 * Los pesos vigentes, o null si nunca se han cambiado.
 *
 * Se ordena por id y no por fecha: dos cambios dentro del mismo segundo
 * tendrian la misma fecha_cambio, y el id es el que de verdad dice cual llego
 * despues.
 */
export function vigente() {
  return db.prepare(`${SELECT_BASE} ORDER BY p.id_peso DESC LIMIT 1`).get() ?? null;
}

/** Los cambios de pesos, del mas reciente al mas antiguo. */
export function historial(limite = 20) {
  return db.prepare(`${SELECT_BASE} ORDER BY p.id_peso DESC LIMIT ?`).all(limite);
}

/**
 * Agrega un juego de pesos, que pasa a ser el vigente.
 *
 * @param {object} datos { antiguedad, reapertura, densidad, motivo, modificado_por }
 * @returns {object} La fila recien insertada, con el nombre de quien la hizo.
 */
export function registrar(datos) {
  // fecha_cambio la pone el DEFAULT de la base: un solo reloj para todo.
  const resultado = db
    .prepare(
      `INSERT INTO PESO_SALUD (antiguedad, reapertura, densidad, motivo, modificado_por)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(datos.antiguedad, datos.reapertura, datos.densidad, datos.motivo, datos.modificado_por);

  return db
    .prepare(`${SELECT_BASE} WHERE p.id_peso = ?`)
    .get(Number(resultado.lastInsertRowid));
}
