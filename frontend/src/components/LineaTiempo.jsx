/**
 * Bitacora de una incidencia como linea de tiempo.
 *
 * Es la parte de la pantalla de detalle que responde "que le ha pasado a esto",
 * y existe porque la trazabilidad del Cap. IV.5 solo vale si se puede leer: la
 * tabla HISTORIAL_INCIDENCIA guarda cada cambio con su autor, su momento y su
 * motivo, pero en forma de filas no cuenta nada.
 *
 * Se dibuja con <ol> y no con <div>: el orden es parte del significado, y un
 * lector de pantalla debe anunciar "1 de 4" al recorrerla. Con divs ese orden
 * seria solo visual.
 *
 * El orden es del movimiento mas antiguo al mas reciente, tal como lo entrega
 * el backend. Se lee como un relato ("se registro, se tomo, se resolvio") y no
 * se invierte: leer un historial al reves obliga a reconstruir el recorrido
 * mentalmente.
 */
import EtiquetaEstado from './EtiquetaEstado.jsx';
import { formatearFechaHora } from '../dominio/incidencias.js';

/**
 * Reaperturas: pasar de RESUELTA a EN_PROGRESO.
 *
 * Se senalan porque no son un movimiento mas. Son el evento que castiga el
 * indice de salud (una solucion que no resolvio), y quien mira la bitacora para
 * entender por que una incidencia baja el indice del proyecto necesita
 * encontrarlas sin ir contando estados a mano.
 */
function esReapertura(movimiento) {
  return movimiento.estado_anterior === 'RESUELTA' && movimiento.estado_nuevo === 'EN_PROGRESO';
}

export default function LineaTiempo({ movimientos }) {
  // No deberia ocurrir: crear una incidencia escribe su primera linea en la
  // misma transaccion. Se contempla igual porque la alternativa es una seccion
  // vacia sin explicacion, y si alguna vez pasa conviene que se vea como lo que
  // seria: un dato que falta, no una incidencia sin historia.
  if (movimientos.length === 0) {
    return <p className="vacio">Esta incidencia no tiene movimientos registrados.</p>;
  }

  return (
    <ol className="linea-tiempo">
      {movimientos.map((movimiento) => (
        <li
          key={movimiento.id_historial}
          className={esReapertura(movimiento) ? 'hito hito--reapertura' : 'hito'}
        >
          <div className="hito__cambio">
            {/* El primer registro no tiene estado anterior: es la creacion.
                Mostrar una flecha desde la nada se veria como un dato perdido,
                asi que se nombra el acto en su lugar. */}
            {movimiento.estado_anterior ? (
              <>
                <EtiquetaEstado estado={movimiento.estado_anterior} />
                <span className="hito__flecha" aria-hidden="true">
                  &rarr;
                </span>
                <EtiquetaEstado estado={movimiento.estado_nuevo} />
              </>
            ) : (
              <>
                <span className="hito__origen">Registrada</span>
                <span className="hito__flecha" aria-hidden="true">
                  &rarr;
                </span>
                <EtiquetaEstado estado={movimiento.estado_nuevo} />
              </>
            )}

            {esReapertura(movimiento) && <span className="marca marca--reapertura">Reapertura</span>}
          </div>

          <p className="hito__meta">
            {formatearFechaHora(movimiento.fecha_cambio)} &middot;{' '}
            <strong>{movimiento.modificado_por_nombre}</strong>
          </p>

          {/* El comentario es opcional en casi todas las transiciones, asi que
              su ausencia es normal y no se rellena con un "sin comentario" que
              solo agregaria ruido a la lista. */}
          {movimiento.comentario && <p className="hito__comentario">{movimiento.comentario}</p>}
        </li>
      ))}
    </ol>
  );
}
