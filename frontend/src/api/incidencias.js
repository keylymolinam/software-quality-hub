/**
 * Llamadas al backend relacionadas con incidencias.
 *
 * Como el resto de los archivos de api/, aqui solo se traducen funciones a
 * rutas. No se valida ni se transforma nada: lo que devuelve el backend se
 * entrega tal cual, y quien lo pinta decide como mostrarlo.
 */
import { api, construirConsulta } from './client.js';

/**
 * Listado de incidencias con filtros, busqueda, orden y paginacion.
 *
 * Todos los parametros son opcionales; los que vengan vacios no se envian.
 *
 * @param {object} parametros
 *   estado, prioridad, categoria    valores del enumerado
 *   id_proyecto, asignado_a,
 *   reportado_por                   identificadores
 *   busqueda                        texto libre sobre titulo y descripcion
 *   ordenarPor, direccion           criterio de orden ('DESC' por defecto)
 *   pagina, limite                  paginacion (limite maximo 100)
 *
 * @returns {Promise<{ datos: Array, paginacion: { total, pagina, limite, paginas } }>}
 *
 * Devuelve un objeto y no un arreglo pelado porque el total y la pagina actual
 * no tendrian donde ir. Conviene no "desenvolverlo" aqui: la tabla necesita
 * `datos` y el pie de la tabla necesita `paginacion`, y son la misma respuesta.
 */
export function listarIncidencias(parametros = {}) {
  return api.get(`/incidencias${construirConsulta(parametros)}`);
}

/**
 * Registra una incidencia.
 *
 * Campos obligatorios: `titulo` (5 a 150), `descripcion` (10 a 5000) e
 * `id_proyecto`. Opcionales: `categoria`, `prioridad` y `asignado_a`.
 *
 * Los campos vacios se quitan antes de enviar, y eso no es cosmetico: dejar
 * `categoria: ''` fuera del cuerpo es lo que le indica al backend que debe
 * deducirla. El motor solo rellena lo que se dejo en blanco.
 *
 * `reportado_por` NO se envia nunca. El autor sale del token, y si llega en el
 * cuerpo el backend responde 400 en lugar de ignorarlo.
 *
 * @returns {Promise<object>} La incidencia creada. Trae dos bloques extra:
 *   `clasificacion`          lo que dedujo el motor, con su evidencia.
 *   `advertencia_duplicado`  presente solo si encontro un posible duplicado.
 */
export function crearIncidencia(datos) {
  const cuerpo = {};

  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== '' && valor !== null && valor !== undefined) {
      cuerpo[clave] = valor;
    }
  }

  return api.post('/incidencias', cuerpo);
}

/**
 * Pide la clasificacion que el motor DEDUCIRIA para un texto, sin crear nada.
 *
 * Es un POST aunque no modifique nada, porque una descripcion puede tener miles
 * de caracteres y eso no cabe en una direccion.
 *
 * No exige longitudes minimas, asi que se puede llamar con texto a medio
 * escribir: es justo para lo que existe.
 *
 * @returns {Promise<{ categoria, prioridad, confianza, evidencia }>}
 */
export function clasificarTexto({ titulo, descripcion }) {
  return api.post('/incidencias/clasificar', { titulo, descripcion });
}
