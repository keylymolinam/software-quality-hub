/**
 * Filtros que comparten las dos vistas de incidencias: la lista y el tablero.
 *
 * Las dos vistas leen los filtros de la direccion con los mismos nombres
 * (?id_proyecto=2&prioridad=ALTA). Es lo que permite pasar de una a otra sin
 * perder lo filtrado: el selector de vista copia la cadena de consulta y listo.
 * Con nombres distintos en cada vista habria que traducir en cada salto, y un
 * filtro nuevo que alguien olvidara traducir se perderia sin aviso.
 */

/**
 * Valor del filtro "Mis incidencias" en la direccion (?asignado_a=yo).
 *
 * Se guarda "yo" y no el id de quien filtra: asi un enlace compartido significa
 * lo mismo para cualquiera que lo abra (sus propias incidencias), en vez de
 * mostrarle a otra persona las de quien lo copio. Se traduce al id recien al
 * pedir los datos, con consultaParaApi().
 */
export const ASIGNADO_A_MI = 'yo';

/** Filtros que valen en las dos vistas, en el orden en que se leen. */
export const FILTROS_COMPARTIDOS = [
  'busqueda',
  'prioridad',
  'categoria',
  'id_proyecto',
  'asignado_a',
  'posible_duplicado',
];

/**
 * Lo que solo tiene sentido en la lista y se descarta al pasar al tablero:
 * el estado (en el tablero cada columna ya es un estado), el orden (las
 * columnas se ordenan por prioridad) y la pagina.
 */
export const SOLO_EN_LISTA = ['estado', 'ordenarPor', 'direccion', 'pagina'];

/**
 * Prepara los filtros para el backend: traduce "Mis incidencias" al id de
 * quien esta usando la aplicacion. El resto pasa tal cual.
 */
export function consultaParaApi(filtros, usuario) {
  if (filtros.asignado_a !== ASIGNADO_A_MI) return filtros;
  return { ...filtros, asignado_a: String(usuario.id_usuario) };
}

/**
 * Los filtros vigentes, para construir los siguientes a partir de ellos.
 *
 * Se leen de la direccion del navegador y no de los que recibe el actualizador
 * de react-router (`anteriores`). Esos son los del ultimo dibujado: al elegir
 * un filtro la direccion cambia en el acto, pero la pantalla se vuelve a
 * dibujar un momento despues, y un segundo filtro elegido en ese intervalo
 * partia de la copia vieja y borraba el primero (Estado = Cerrada y luego
 * Prioridad = Alta dejaba solo la prioridad). Lo encontro la prueba de
 * interaccion del listado cuando la tabla, con sus desplegables por fila,
 * empezo a tardar mas en dibujarse. La direccion siempre esta al dia.
 *
 * `anteriores` queda como respaldo para cuando no hay navegador.
 */
export function parametrosActuales(anteriores) {
  const enLaDireccion = globalThis.location?.search;
  return new URLSearchParams(enLaDireccion ?? anteriores);
}
