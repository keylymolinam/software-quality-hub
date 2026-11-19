/**
 * Barra de progreso del ciclo de vida de una incidencia.
 *
 * Muestra el camino completo y en que punto esta la incidencia: lo hecho
 * relleno, el paso actual destacado y lo que falta en gris. Existe por la
 * prueba de usuarios: dos participantes dijeron que no se entendia por que
 * estados pasa una incidencia ni que viene despues, y la autora, al probar el
 * flujo nuevo, busco "Validar" en una incidencia pendiente. Los botones solo
 * dicen el siguiente paso; esta barra dice el camino entero.
 *
 * Se descarto una fila de pasos con flechas, que era la primera idea: la
 * autora la encontro anticuada. Una barra continua que se va llenando es la
 * forma que la gente ya conoce del seguimiento de un pedido.
 *
 * ---------------------------------------------------------------------------
 * LOS PASOS ESTAN AQUI Y NO VIENEN DEL BACKEND
 *
 * El backend dice que transiciones son posibles desde el estado actual, no el
 * camino ideal completo; ese camino es una forma de mostrar el flujo, no una
 * regla. Si la maquina de estados cambia, la regla sigue en el servidor y aqui
 * solo habria que corregir el dibujo.
 *
 * El rechazo (cerrar sin resolver) no esta en el camino principal: se reconoce
 * porque la incidencia esta CERRADA sin fecha de resolucion, y se dibuja
 * distinto para no afirmar que paso por resolucion y validacion.
 */
import { ESTADOS, etiquetaDe } from '../dominio/incidencias.js';

/** El camino principal, en orden. */
const PASOS = ['ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'VALIDADA', 'CERRADA'];

export default function ProgresoFlujo({ estado, fechaResolucion }) {
  const actual = PASOS.indexOf(estado);
  const rechazada = estado === 'CERRADA' && !fechaResolucion;

  // Que fraccion de la linea va rellena (0 a 1): hasta el paso actual. En un
  // rechazo no se rellena nada, porque no hubo resolucion ni validacion. Va
  // sin unidad porque CSS la multiplica por el largo de la linea.
  const relleno = rechazada ? 0 : Math.max(actual, 0) / (PASOS.length - 1);

  return (
    <section className="tarjeta progreso" aria-label="Avance de la incidencia">
      <ol className="progreso__pasos" style={{ '--progreso-relleno': relleno }}>
        {PASOS.map((paso, posicion) => {
          let situacion = 'pendiente';
          if (posicion < actual) situacion = rechazada ? 'omitido' : 'hecho';
          if (posicion === actual) situacion = rechazada ? 'rechazado' : 'actual';
          if (rechazada && posicion === 0) situacion = 'hecho';

          return (
            <li
              key={paso}
              className={`progreso__paso progreso__paso--${situacion}`}
              aria-current={posicion === actual ? 'step' : undefined}
            >
              <span className="progreso__punto" aria-hidden="true" />
              <span className="progreso__nombre">{etiquetaDe(ESTADOS, paso)}</span>
            </li>
          );
        })}
      </ol>

      {rechazada && (
        <p className="progreso__nota">
          Se cerr&oacute; sin resolver: no pas&oacute; por resoluci&oacute;n ni validaci&oacute;n.
          El motivo est&aacute; en la bit&aacute;cora.
        </p>
      )}
    </section>
  );
}
