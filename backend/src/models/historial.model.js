/**
 * Model de HISTORIAL_INCIDENCIA.
 *
 * Guarda la bitacora de cambios de estado de cada incidencia. Es una tabla que
 * solo crece: no se actualiza ni se borra, porque su valor esta justamente en
 * ser un registro fiel de lo que paso.
 *
 * Alimenta dos cosas del proyecto:
 *   - La trazabilidad exigida en el Cap. IV.5 (quien cambio que y cuando).
 *   - La tasa de reapertura del indice de salud, que se calcula contando las
 *     filas con estado_anterior = 'RESUELTA' y estado_nuevo = 'EN_PROGRESO'.
 *
 * Por eso mismo, escribir aqui NUNCA debe ser opcional: si se pudiera cambiar
 * el estado sin dejar rastro, el indicador de deuda tecnica mentiria. La
 * garantia de que ambas escrituras ocurren juntas la da la transaccion que
 * abre el service (ver enTransaccion en db/database.js).
 */
import { db } from '../db/database.js';

/**
 * Agrega un registro a la bitacora.
 *
 * @param {object}      datos
 * @param {number}      datos.id_incidencia
 * @param {string|null} datos.estado_anterior  null solo al crear la incidencia.
 * @param {string}      datos.estado_nuevo
 * @param {number}      datos.modificado_por   Usuario que realizo el cambio.
 * @param {string|null} datos.comentario       Motivo del cambio, opcional.
 * @returns {object} La fila recien insertada.
 */
export function registrar(datos) {
  const sql = `
    INSERT INTO HISTORIAL_INCIDENCIA (
        id_incidencia, estado_anterior, estado_nuevo, modificado_por, comentario
    ) VALUES (?, ?, ?, ?, ?)
  `;

  // fecha_cambio no se indica: la pone el DEFAULT datetime('now') del esquema,
  // para que la hora venga siempre del mismo reloj (el de la base de datos).
  const resultado = db
    .prepare(sql)
    .run(
      datos.id_incidencia,
      datos.estado_anterior ?? null,
      datos.estado_nuevo,
      datos.modificado_por,
      datos.comentario ?? null
    );

  return obtenerPorId(Number(resultado.lastInsertRowid));
}

/** Devuelve un registro puntual de la bitacora. */
export function obtenerPorId(idHistorial) {
  return db
    .prepare(
      `SELECT h.*, u.nombre AS modificado_por_nombre
         FROM HISTORIAL_INCIDENCIA h
         INNER JOIN USUARIO u ON u.id_usuario = h.modificado_por
        WHERE h.id_historial = ?`
    )
    .get(idHistorial);
}

/**
 * Devuelve la bitacora completa de una incidencia, del cambio mas antiguo al
 * mas reciente.
 *
 * El orden ascendente es deliberado: se lee como un relato ("se creo, se tomo,
 * se resolvio, se reabrio"). Se desempata por id_historial porque dos cambios
 * hechos en el mismo segundo comparten fecha_cambio, y sin el desempate
 * podrian aparecer invertidos.
 */
export function listarPorIncidencia(idIncidencia) {
  return db
    .prepare(
      `SELECT
          h.id_historial,
          h.estado_anterior,
          h.estado_nuevo,
          h.fecha_cambio,
          h.comentario,
          h.modificado_por,
          u.nombre AS modificado_por_nombre
        FROM HISTORIAL_INCIDENCIA h
        INNER JOIN USUARIO u ON u.id_usuario = h.modificado_por
       WHERE h.id_incidencia = ?
       ORDER BY h.fecha_cambio ASC, h.id_historial ASC`
    )
    .all(idIncidencia);
}
