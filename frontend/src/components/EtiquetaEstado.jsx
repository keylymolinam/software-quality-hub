/**
 * Estado de una incidencia, como distintivo de color.
 *
 * El color no es decoracion: en un listado largo permite ver de una pasada
 * cuanto hay abierto y cuanto cerrado, sin leer palabra por palabra. Aun asi el
 * texto va siempre escrito, porque el color por si solo no sirve para quien no
 * lo distingue.
 */
import { ESTADOS, etiquetaDe } from '../dominio/incidencias.js';

export default function EtiquetaEstado({ estado }) {
  // El valor llega en mayusculas ('EN_PROGRESO') y la clase CSS se escribe en
  // minusculas ('etiqueta-estado--en_progreso'). Se deja el guion bajo tal cual
  // para que la clase se derive del valor sin tener que mantener una tabla de
  // equivalencias aparte.
  return (
    <span className={`etiqueta-estado etiqueta-estado--${estado.toLowerCase()}`}>
      {etiquetaDe(ESTADOS, estado)}
    </span>
  );
}
