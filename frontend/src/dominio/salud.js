/**
 * Vocabulario del indice de salud para la interfaz.
 *
 * El backend devuelve las etiquetas como identificadores en mayusculas
 * ('SIN_DATOS'), que no son texto para leer. Este archivo las traduce.
 *
 * Vivia dentro de pages/Inicio.jsx mientras esa era la unica pantalla que las
 * mostraba. Se movio aqui al aparecer la segunda (la del desglose), que es la
 * condicion que el propio comentario anterior anunciaba: dos pantallas
 * escribiendo su propio texto para el mismo valor acabarian discrepando.
 */

/** Como se nombra en pantalla cada etiqueta del indice. */
export const ETIQUETAS_SALUD = {
  SALUDABLE: 'Saludable',
  ATENCION: 'Atenci\u00f3n',
  CRITICO: 'Cr\u00edtico',
  SIN_DATOS: 'Sin datos',
};

/**
 * Texto legible de una etiqueta.
 *
 * Si llega un valor que no esta en la tabla se devuelve tal cual, igual que
 * etiquetaDe() en el vocabulario de incidencias: un nombre tecnico a la vista
 * es feo, pero delata que hay un valor nuevo sin traducir. Una cadena vacia
 * esconderia el problema.
 */
export function etiquetaSalud(valor) {
  return ETIQUETAS_SALUD[valor] ?? valor;
}

/**
 * Clase CSS del distintivo de color de una etiqueta.
 *
 * Se arma aqui y no en cada pantalla para que las dos usen la misma, y porque
 * la conversion a minusculas es justo el detalle que se olvida: las clases son
 * `etiqueta-salud--sin_datos`, con guion bajo, derivadas del valor del backend.
 */
export function claseSalud(valor) {
  return `etiqueta-salud etiqueta-salud--${String(valor).toLowerCase()}`;
}
