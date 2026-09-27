/**
 * Prioridad de una incidencia.
 *
 * Se distingue del estado a proposito: el estado es una etiqueta rellena y la
 * prioridad lleva una marca al costado. Si las dos se dibujaran igual, dos
 * distintivos del mismo tamano y forma en la misma fila obligarian a leerlos
 * para saber cual es cual.
 */
import { PRIORIDADES, etiquetaDe } from '../dominio/incidencias.js';

export default function EtiquetaPrioridad({ prioridad }) {
  return (
    <span className={`prioridad prioridad--${prioridad.toLowerCase()}`}>
      {etiquetaDe(PRIORIDADES, prioridad)}
    </span>
  );
}
