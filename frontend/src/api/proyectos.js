/**
 * Llamadas al backend relacionadas con proyectos.
 */
import { api, construirConsulta } from './client.js';

/**
 * Listado de proyectos.
 *
 * Cada proyecto llega con `total_incidencias` e `incidencias_pendientes`, que
 * el backend calcula en la misma consulta.
 *
 * @returns {Promise<{ datos: Array, paginacion: object }>}
 */
export function listarProyectos(parametros = {}) {
  return api.get(`/proyectos${construirConsulta(parametros)}`);
}
