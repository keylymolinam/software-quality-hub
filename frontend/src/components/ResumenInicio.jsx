/**
 * Las dos figuras del mini tablero del inicio: en que va el trabajo y que tan
 * urgente es lo pendiente. Lo pidio la autora para que el inicio no muestre
 * solo el indice. Cada una va en su propia tarjeta (ver Inicio.jsx).
 *
 * Son dos figuras y no mas, a proposito: el indice de salud es el diferenciador
 * del proyecto y va primero; un inicio lleno de graficos lo taparia.
 *
 * ---------------------------------------------------------------------------
 * ESTADOS EN ANILLO, PRIORIDAD EN BARRAS
 *
 * Los estados son partes de un todo (cada incidencia esta en uno solo y la suma
 * es el total), que es el caso en que un anillo se lee bien; con cinco partes
 * todavia se distinguen. La autora lo prefirio a las barras. Para que las
 * tajadas finas no se pierdan, la leyenda escribe el numero y el porcentaje de
 * cada estado: el color identifica, pero la cifra es la que informa, y quien no
 * distingue los colores no pierde nada. Cada estado usa su color de siempre (el
 * de las etiquetas y las tarjetas por estado), asi que es la unica figura del
 * sistema con varios colores, y es porque aqui el color si distingue algo.
 *
 * La prioridad de lo abierto va en barras, con las mismas reglas que las de
 * Salud: un solo color, el valor fuera de la barra.
 *
 * El anillo es un conic-gradient de CSS con un circulo encima: sin libreria de
 * graficos, como el resto de las figuras.
 */
import { ESTADOS, PRIORIDADES } from '../dominio/incidencias.js';

/**
 * El color de cada estado, el mismo de .resumen-estado--* en index.css. Se
 * repite aqui porque el gradiente se arma en el estilo en linea; si cambia
 * uno, hay que cambiar el otro.
 */
const COLOR_ESTADO = {
  ABIERTA: 'var(--color-abierta)',
  EN_PROGRESO: 'var(--color-primario)',
  RESUELTA: 'var(--color-ok)',
  VALIDADA: 'var(--color-validada)',
  CERRADA: 'var(--color-texto-tenue)',
};

const porcentaje = (parte, total) => (total === 0 ? 0 : Math.round((parte / total) * 100));

export function AnilloEstados({ porEstado }) {
  const total = ESTADOS.reduce((suma, { valor }) => suma + (porEstado[valor] ?? 0), 0);

  if (total === 0) {
    return <p className="vacio">Todav&iacute;a no hay incidencias registradas.</p>;
  }

  // Cada tajada empieza donde termino la anterior, en porcentaje del total.
  let acumulado = 0;
  const tramos = ESTADOS.map(({ valor }) => {
    const desde = acumulado;
    acumulado += ((porEstado[valor] ?? 0) / total) * 100;
    return `${COLOR_ESTADO[valor]} ${desde}% ${acumulado}%`;
  });

  const descripcion = ESTADOS.map(
    ({ valor, etiqueta }) => `${etiqueta} ${porEstado[valor] ?? 0}`
  ).join(', ');

  return (
    <div className="anillo-figura">
      <div
        className="anillo"
        role="img"
        aria-label={`Incidencias por estado: ${descripcion}. Total ${total}.`}
        style={{ background: `conic-gradient(${tramos.join(', ')})` }}
      >
        <div className="anillo__centro" aria-hidden="true">
          <span className="anillo__total">{total}</span>
          <span className="anillo__rotulo">incidencias</span>
        </div>
      </div>

      <ul className="leyenda">
        {ESTADOS.map(({ valor, etiqueta }) => (
          <li className="leyenda__fila" key={valor}>
            <span
              className="leyenda__punto"
              style={{ background: COLOR_ESTADO[valor] }}
              aria-hidden="true"
            />
            <span className="leyenda__nombre">{etiqueta}</span>
            <span className="leyenda__valor">{porEstado[valor] ?? 0}</span>
            <span className="leyenda__porcentaje">
              {porcentaje(porEstado[valor] ?? 0, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarrasPrioridad({ abiertasPorPrioridad }) {
  const mayor = Math.max(0, ...PRIORIDADES.map(({ valor }) => abiertasPorPrioridad[valor] ?? 0));

  if (mayor === 0) {
    return <p className="vacio">No hay incidencias abiertas.</p>;
  }

  return (
    <ul className="distribucion">
      {PRIORIDADES.map(({ valor, etiqueta }) => {
        const cantidad = abiertasPorPrioridad[valor] ?? 0;
        return (
          <li className="distribucion__fila" key={valor}>
            <span className="distribucion__nombre">{etiqueta}</span>
            <div
              className="barra barra--delgada"
              role="img"
              aria-label={`${etiqueta}: ${cantidad} abiertas`}
            >
              <div className="barra__relleno" style={{ width: `${(cantidad / mayor) * 100}%` }} />
            </div>
            <span className="distribucion__valor">{cantidad}</span>
          </li>
        );
      })}
    </ul>
  );
}
