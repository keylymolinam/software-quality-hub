/**
 * Vocabulario de PROYECTO para la interfaz.
 *
 * Mismo criterio que dominio/incidencias.js: el backend devuelve los valores en
 * mayusculas porque son identificadores, y aqui se traducen a como se leen.
 *
 * Repite los CHECK de schema.sql y las constantes de proyecto.service.js. Es la
 * duplicacion que el proyecto asume a proposito; agregar un estado obliga a
 * tocar los cuatro lugares (ver CLAUDE.md).
 */
import { etiquetaDe } from './incidencias.js';

/**
 * Estados de un proyecto, en el orden del ciclo de vida y no alfabetico.
 *
 * PAUSADO va al final aunque pueda ocurrir antes de FINALIZADO: es la
 * excepcion, no un paso del camino.
 */
export const ESTADOS_PROYECTO = [
  { valor: 'ACTIVO', etiqueta: 'Activo' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado' },
  { valor: 'PAUSADO', etiqueta: 'Pausado' },
];

/** Texto legible del estado de un proyecto. */
export function etiquetaEstadoProyecto(valor) {
  return etiquetaDe(ESTADOS_PROYECTO, valor);
}
