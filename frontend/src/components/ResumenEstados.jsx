/**
 * Tarjetas con cuantas incidencias hay en cada estado, sobre el listado.
 *
 * Responden de un vistazo la pregunta con que se abre esta pantalla, "como
 * vamos", antes de leer una sola fila. Y son tambien un filtro: pulsar una
 * deja el listado en ese estado, y pulsarla otra vez lo quita. Es el mismo
 * filtro "Estado" de la barra, escrito en la misma direccion, asi que los dos
 * siempre coinciden.
 *
 * Los numeros vienen del backend (`resumen_estados`), en la misma respuesta
 * que la tabla. Contarlos aqui con las filas recibidas no serviria: la tabla
 * trae una sola pagina, y la cuenta saldria corta en cuanto hubiera dos.
 *
 * Son botones con aria-pressed y no enlaces: no llevan a otra pantalla, cambian
 * un filtro de esta, y el lector de pantalla anuncia cual esta activo.
 */
import { ESTADOS } from '../dominio/incidencias.js';

export default function ResumenEstados({ resumen, estadoActivo, onElegir }) {
  return (
    <div className="resumen-estados" role="group" aria-label="Incidencias por estado">
      {ESTADOS.map(({ valor, etiqueta }) => {
        const activo = estadoActivo === valor;

        return (
          <button
            key={valor}
            type="button"
            className={
              `resumen-estado resumen-estado--${valor.toLowerCase()}` +
              (activo ? ' resumen-estado--activo' : '')
            }
            aria-pressed={activo}
            onClick={() => onElegir(activo ? '' : valor)}
          >
            <span className="resumen-estado__nombre">{etiqueta}</span>
            <span className="resumen-estado__total">{resumen[valor] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
