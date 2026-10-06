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

/**
 * Registra un proyecto. Solo ADMINISTRADOR.
 *
 * Obligatorio: `nombre` (3 a 100). Opcionales: `descripcion` (10 a 1000),
 * `fecha_inicio` (AAAA-MM-DD) y `estado`, que por defecto queda ACTIVO.
 *
 * Los campos vacios se quitan antes de enviar: una descripcion en blanco
 * significa "sin descripcion", y el backend la validaria como texto demasiado
 * corto si llegara como cadena vacia.
 */
export function crearProyecto(datos) {
  const cuerpo = {};

  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== '' && valor !== null && valor !== undefined) {
      cuerpo[clave] = valor;
    }
  }

  return api.post('/proyectos', cuerpo);
}

/**
 * Modifica un proyecto. Solo ADMINISTRADOR. Actualizacion parcial.
 *
 * Aqui los vacios SI viajan, convertidos a null: enviar `descripcion: null` es
 * la unica forma de borrar una descripcion que ya existia. Es la misma
 * distincion que en las incidencias, y por el mismo motivo: el backend mira si
 * el campo vino, no su valor.
 */
export function actualizarProyecto(id, cambios) {
  return api.put(`/proyectos/${id}`, cambios);
}

/**
 * Elimina un proyecto. Solo ADMINISTRADOR.
 *
 * Responde 409 si tiene incidencias asociadas: la clave foranea es RESTRICT a
 * proposito, porque borrarlo destruiria el trabajo registrado. El mensaje del
 * backend sugiere la alternativa (pasarlo a FINALIZADO).
 */
export function eliminarProyecto(id) {
  return api.delete(`/proyectos/${id}`);
}
