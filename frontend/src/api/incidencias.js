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

/**
 * Detalle de una incidencia.
 *
 * Ademas de las columnas, la respuesta trae `transiciones_posibles`: la lista
 * de estados a los que se puede pasar desde el actual. Viene del backend a
 * proposito, para que la pantalla de detalle dibuje un boton por transicion
 * permitida sin tener que conocer la maquina de estados.
 *
 * @returns {Promise<object>}
 */
export function obtenerIncidencia(id) {
  return api.get(`/incidencias/${id}`);
}

/**
 * Cambia el estado de una incidencia.
 *
 * Es la UNICA via para mover el estado; no existe un PUT del campo. La peticion
 * tambien escribe la bitacora, y por eso el autor no se envia: se toma del
 * token. Mandarlo permitiria firmar un cambio con el nombre de otra persona.
 *
 * @param {number|string} id
 * @param {object} datos
 * @param {string} datos.estado       Estado de destino.
 * @param {string} [datos.comentario] Motivo. Obligatorio en ABIERTA -> CERRADA.
 *
 * @returns {Promise<object>} La incidencia ya actualizada, con las
 *   `transiciones_posibles` que correspondan a su estado nuevo.
 */
export function cambiarEstado(id, { estado, comentario }) {
  const cuerpo = { estado };

  // Un comentario en blanco no se envia en lugar de enviarse vacio: el backend
  // exige un minimo de 3 caracteres y responderia 400 por un campo que la
  // persona decidio no llenar. Omitirlo es lo que significa "sin comentario".
  const motivo = comentario?.trim();
  if (motivo) {
    cuerpo.comentario = motivo;
  }

  return api.post(`/incidencias/${id}/transicion`, cuerpo);
}

/**
 * Bitacora de cambios de estado, del mas antiguo al mas reciente.
 *
 * El primer registro siempre es la creacion y llega con `estado_anterior` en
 * null; los demas tienen los dos estados.
 *
 * @returns {Promise<{ id_incidencia: number, total: number, movimientos: Array }>}
 */
export function obtenerHistorial(id) {
  return api.get(`/incidencias/${id}/historial`);
}

/**
 * Modifica una incidencia. Actualizacion parcial: solo lo que se envia.
 *
 * A diferencia de crearIncidencia(), aqui NO se quitan los campos vacios, y esa
 * diferencia es deliberada porque el vacio significa cosas opuestas en cada
 * caso. Al crear, dejar la categoria en blanco es lo que le pide al motor que
 * la deduzca, asi que el campo no debe viajar. Al modificar, enviar
 * `asignado_a: null` es la unica forma de quitarle el responsable a una
 * incidencia: si se omitiera, el backend entenderia "no lo toques".
 *
 * El backend distingue las dos situaciones con Object.hasOwn, no mirando el
 * valor, asi que la diferencia entre omitir y mandar null es real.
 *
 * Campos que rechaza con 400, cada uno con su motivo: `estado` (se cambia por
 * la transicion), `fecha_resolucion` y `clasificacion_automatica` (los pone el
 * sistema) y `reportado_por` (es un dato historico).
 *
 * Un cuerpo sin ningun campo modificable tambien responde 400: casi siempre
 * significa que quien llama se equivoco en los nombres.
 *
 * @param {number|string} id
 * @param {object} cambios  Solo los campos que cambian.
 * @returns {Promise<object>} La incidencia ya actualizada.
 */
export function actualizarIncidencia(id, cambios) {
  return api.put(`/incidencias/${id}`, cambios);
}

/**
 * Descarta la marca de posible duplicado.
 *
 * Es un caso particular de actualizarIncidencia, con nombre propio porque
 * expresa una decision del dominio: una persona reviso el aviso del detector y
 * determino que las dos incidencias son problemas distintos.
 *
 * El detector avisa; esto es la otra mitad del trato. La incidencia no se
 * modifica de ninguna otra forma: solo deja de estar marcada.
 */
export function descartarDuplicado(id) {
  return api.put(`/incidencias/${id}`, { posible_duplicado_de: null });
}
