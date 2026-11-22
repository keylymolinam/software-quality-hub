/**
 * Model de COMENTARIO.
 *
 * Los comentarios son la conversacion de una incidencia: preguntas, avances,
 * pasos para reproducir que alguien encontro despues. Viven en su propia tabla
 * y no en HISTORIAL_INCIDENCIA a proposito: la bitacora registra cambios de
 * estado y de ella sale el indice de salud; mezclar ahi la conversacion
 * ensuciaria las metricas y obligaria a cada consulta a filtrar lo que no es
 * un cambio de estado.
 *
 * Como la bitacora, es una tabla que solo crece: un comentario no se edita ni
 * se borra, para que lo dicho quede como registro. Solo desaparece si se
 * elimina la incidencia completa (ON DELETE CASCADE).
 */
import { db } from '../db/database.js';

/**
 * Agrega un comentario y devuelve la fila completa, con el nombre del autor.
 *
 * @param {object} datos
 * @param {number} datos.id_incidencia
 * @param {number} datos.autor           Usuario de la sesion, nunca del cuerpo.
 * @param {string} datos.texto           Ya validado y sin espacios en los bordes.
 * @param {string} datos.fecha_creacion  De ahora(), el reloj de SQLite.
 */
export function registrar({ id_incidencia, autor, texto, fecha_creacion }) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO COMENTARIO (texto, fecha_creacion, id_incidencia, autor)
       VALUES (?, ?, ?, ?)`
    )
    .run(texto, fecha_creacion, id_incidencia, autor);

  return obtenerPorId(Number(lastInsertRowid));
}

/** Un comentario con el nombre de su autor. */
export function obtenerPorId(idComentario) {
  return db
    .prepare(
      `SELECT c.id_comentario, c.texto, c.fecha_creacion, c.id_incidencia, c.autor,
              u.nombre AS autor_nombre
         FROM COMENTARIO c
         INNER JOIN USUARIO u ON u.id_usuario = c.autor
        WHERE c.id_comentario = ?`
    )
    .get(idComentario);
}

/**
 * Los comentarios de una incidencia, del mas antiguo al mas reciente: se leen
 * como una conversacion, de arriba hacia abajo. Se desempata por id porque
 * dos comentarios del mismo segundo comparten fecha.
 */
export function listarPorIncidencia(idIncidencia) {
  return db
    .prepare(
      `SELECT c.id_comentario, c.texto, c.fecha_creacion, c.id_incidencia, c.autor,
              u.nombre AS autor_nombre
         FROM COMENTARIO c
         INNER JOIN USUARIO u ON u.id_usuario = c.autor
        WHERE c.id_incidencia = ?
        ORDER BY c.fecha_creacion ASC, c.id_comentario ASC`
    )
    .all(idIncidencia);
}
