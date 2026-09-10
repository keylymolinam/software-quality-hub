/**
 * Model de PROYECTO.
 *
 * Por ahora solo expone lo minimo que necesita el service de incidencias para
 * validar la clave foranea `id_proyecto`. El CRUD completo de proyectos se
 * agrega en su propia iteracion, siguiendo el mismo patron que INCIDENCIA.
 *
 * Existe como archivo aparte, en lugar de poner la consulta dentro del service
 * de incidencias, porque la regla de arquitectura del proyecto es que SOLO los
 * models escriben SQL. Un service que consulta la base directamente rompe la
 * separacion en tres capas.
 */
import { db } from '../db/database.js';

/** Indica si existe un proyecto con ese identificador. */
export function existe(id) {
  const fila = db.prepare('SELECT 1 AS existe FROM PROYECTO WHERE id_proyecto = ?').get(id);
  return fila !== undefined;
}

/** Devuelve el proyecto completo, o undefined si no existe. */
export function obtenerPorId(id) {
  return db.prepare('SELECT * FROM PROYECTO WHERE id_proyecto = ?').get(id);
}
