/**
 * Actividad reciente: los ultimos movimientos de la bitacora de todo el
 * sistema, para el inicio. Lo pidio la autora.
 *
 * Es la misma bitacora que se ve en el detalle de cada incidencia y que
 * alimenta el indice de salud, leida de lo mas nuevo a lo mas viejo. Mostrarla
 * aqui hace visible la trazabilidad: todo cambio queda con quien y cuando.
 *
 * Cada linea se escribe como una frase ("Ana paso #12 a En desarrollo") y no
 * como una fila de tabla: se lee de corrido, como un registro de lo que paso.
 * La reapertura se nombra aparte porque es el movimiento que el indice castiga.
 *
 * Solo hay creaciones y cambios de estado porque es lo que la bitacora guarda;
 * editar la prioridad o la asignacion no deja linea.
 */
import { Link } from 'react-router-dom';

import EtiquetaEstado from './EtiquetaEstado.jsx';
import { formatearFechaHora, haceCuanto, inicialesDe } from '../dominio/incidencias.js';

/** El verbo de cada movimiento. */
function verboDe(movimiento) {
  if (movimiento.estado_anterior === null) return 'registr\u00f3';
  if (movimiento.estado_anterior === 'RESUELTA' && movimiento.estado_nuevo === 'EN_PROGRESO') {
    return 'reabri\u00f3';
  }
  return 'pas\u00f3';
}

export default function ActividadReciente({ movimientos }) {
  if (movimientos.length === 0) {
    return <p className="vacio">Todav&iacute;a no hay movimientos registrados.</p>;
  }

  return (
    <ol className="actividad">
      {movimientos.map((movimiento) => {
        const verbo = verboDe(movimiento);
        return (
          <li className="actividad__fila" key={movimiento.id_historial}>
            <span className="persona__avatar" aria-hidden="true">
              {inicialesDe(movimiento.modificado_por_nombre)}
            </span>

            <span className="actividad__texto">
              <strong>{movimiento.modificado_por_nombre}</strong> {verbo}{' '}
              <Link to={`/incidencias/${movimiento.id_incidencia}`}>
                #{movimiento.id_incidencia} {movimiento.titulo}
              </Link>
              {/* Al registrar, el estado es siempre el inicial: decirlo no
                  agrega nada. En los cambios, el estado de llegada es el dato. */}
              {verbo !== 'registr\u00f3' && (
                <>
                  {' '}a <EtiquetaEstado estado={movimiento.estado_nuevo} />
                </>
              )}
              {movimiento.comentario && (
                <span className="actividad__comentario">&laquo;{movimiento.comentario}&raquo;</span>
              )}
            </span>

            <time className="actividad__cuando" dateTime={movimiento.fecha_cambio}>
              {haceCuanto(movimiento.fecha_cambio)}
              <span className="actividad__exacta">{formatearFechaHora(movimiento.fecha_cambio)}</span>
            </time>
          </li>
        );
      })}
    </ol>
  );
}
