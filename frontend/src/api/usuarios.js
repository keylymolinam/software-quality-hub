/**
 * Llamadas al backend relacionadas con usuarios.
 */
import { api, construirConsulta } from './client.js';

/**
 * Listado de usuarios.
 *
 * Ninguna respuesta del backend incluye la columna del hash de la contrasena,
 * asi que no hay nada que filtrar aqui.
 *
 * @returns {Promise<{ datos: Array, paginacion: object }>}
 */
export function listarUsuarios(parametros = {}) {
  return api.get(`/usuarios${construirConsulta(parametros)}`);
}

/**
 * Registra un usuario. Solo ADMINISTRADOR.
 *
 * Obligatorios: `nombre` (3 a 100), `correo_electronico`, `contrasena` (8 a 72)
 * y `rol`. La respuesta nunca incluye la contrasena ni su hash.
 *
 * El limite de 72 no es arbitrario: es el que impone bcrypt, que ignora lo que
 * pase de ahi. Aceptar mas haria que dos claves distintas abrieran la misma
 * cuenta.
 */
export function crearUsuario(datos) {
  return api.post('/usuarios', datos);
}

/**
 * Modifica un usuario. Actualizacion parcial.
 *
 * Quien puede: el propio usuario o un ADMINISTRADOR. Con una excepcion que el
 * backend hace cumplir: cambiar el `rol` es solo de un administrador, asi que
 * alguien no puede ascenderse a si mismo.
 *
 * La contrasena NO se cambia por esta via; el backend responde 400 si llega.
 * Para eso existe cambiarContrasena(), que exige la actual.
 */
export function actualizarUsuario(id, cambios) {
  return api.put(`/usuarios/${id}`, cambios);
}

/**
 * Cambia la contrasena. SOLO el propio usuario, ni un administrador.
 *
 * Es la unica operacion del sistema que el rol de administrador no alcanza, y
 * el motivo es que exige conocer la contrasena vigente: eso protege contra
 * quien se siente frente a una sesion ajena abierta, y deja claro que nadie
 * puede apropiarse de una cuenta sin conocer su clave.
 *
 * @param {object} datos  { contrasena_actual, contrasena_nueva }
 */
export function cambiarContrasena(id, datos) {
  return api.put(`/usuarios/${id}/contrasena`, datos);
}

/**
 * Elimina un usuario. Solo ADMINISTRADOR.
 *
 * Responde 409 si reporto incidencias o registro cambios de estado: borrarlo
 * destruiria la trazabilidad de ese trabajo. El mensaje del backend sugiere la
 * alternativa, que es cambiarle el rol o dejar la cuenta sin uso.
 */
export function eliminarUsuario(id) {
  return api.delete(`/usuarios/${id}`);
}
