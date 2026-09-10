/**
 * Model de USUARIO.
 *
 * Igual que proyecto.model.js: por ahora solo lo indispensable para validar
 * las claves foraneas `reportado_por` y `asignado_a` desde el service de
 * incidencias. El CRUD completo y el inicio de sesion vienen despues.
 *
 * Importante para cuando se agregue la autenticacion: ninguna consulta que
 * alimente respuestas de la API debe traer la columna `contrasena_hash`. Por
 * eso obtenerPorId() nombra las columnas una por una en lugar de usar
 * SELECT *, que la incluiria sin que nadie se de cuenta.
 */
import { db } from '../db/database.js';

/** Indica si existe un usuario con ese identificador. */
export function existe(id) {
  const fila = db.prepare('SELECT 1 AS existe FROM USUARIO WHERE id_usuario = ?').get(id);
  return fila !== undefined;
}

/** Devuelve el usuario sin datos sensibles, o undefined si no existe. */
export function obtenerPorId(id) {
  return db
    .prepare(
      `SELECT id_usuario, nombre, correo_electronico, rol, fecha_creacion
         FROM USUARIO
        WHERE id_usuario = ?`
    )
    .get(id);
}
