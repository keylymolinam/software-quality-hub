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
