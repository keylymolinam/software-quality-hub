/**
 * Vocabulario de USUARIO para la interfaz.
 *
 * Los roles llegan en mayusculas porque son identificadores; aqui se traducen a
 * como se leen. Repite ROLES de usuario.service.js y el CHECK de schema.sql: la
 * duplicacion declarada del proyecto (ver CLAUDE.md).
 */
import { etiquetaDe } from './incidencias.js';

/**
 * Roles, del que mas puede al que menos.
 *
 * El orden no es alfabetico a proposito: al elegir un rol en un desplegable, lo
 * que se compara es cuanto permite cada uno.
 */
export const ROLES = [
  { valor: 'ADMINISTRADOR', etiqueta: 'Administrador' },
  { valor: 'DESARROLLADOR', etiqueta: 'Desarrollador' },
  { valor: 'TESTER', etiqueta: 'Tester' },
  { valor: 'ANALISTA', etiqueta: 'Analista' },
];

/** Texto legible de un rol. */
export function etiquetaRol(valor) {
  return etiquetaDe(ROLES, valor);
}
