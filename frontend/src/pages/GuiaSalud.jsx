/**
 * Guia del indice de salud: que es, para que sirve y como se calcula.
 *
 * Existe por la prueba de usuarios: cuatro de los cinco participantes del
 * perfil objetivo no entendieron la pantalla de Salud, y uno pidio en concreto
 * saber "como se saca el %". La autora tampoco la encontro clara. La pantalla
 * de Salud muestra la evidencia de UN ambito; esta guia explica la regla que
 * vale para todos, una sola vez y en lenguaje simple.
 *
 * Se descartaron los globos de ayuda al pasar el cursor (title o tooltips):
 * en la revision de la autora el globo del navegador se vio feo, no se puede
 * estilizar y en pantallas tactiles no aparece. Una pagina se lee entera,
 * sirve tambien como material para la defensa y se puede enlazar.
 *
 * LOS PESOS SE PIDEN; LOS LIMITES ESTAN ESCRITOS A MANO
 *
 * Los pesos los puede cambiar el administrador (pantalla /salud/pesos), asi
 * que se piden al servidor: una guia con pesos copiados explicaria un indice
 * que ya no existe al primer cambio.
 *
 * Limites y umbrales siguen fijos en backend/src/services/salud.service.js
 * (LIMITE_ANTIGUEDAD_DIAS, LIMITE_REAPERTURA y UMBRALES) y se copian aqui,
 * porque no viajan en la API. Si se cambian alla hay que cambiarlos aqui; una
 * prueba de pantallas compara las dos copias.
 */
import { Link } from 'react-router-dom';

import { obtenerPesos } from '../api/metricas.js';
import { claseSalud, etiquetaSalud } from '../dominio/salud.js';
import { usePeticion } from '../hooks/usePeticion.js';

/** Copia de los limites y umbrales de salud.service.js. Cambiar los dos a la vez. */
const PARAMETROS = {
  limiteDias: 90,
  limiteReapertura: 30,
  umbrales: { saludable: 80, atencion: 60 },
};

/** Redondea a un decimal, igual que el backend. */
const redondear = (n) => Math.round(n * 10) / 10;

/**
 * Un ejemplo completo, con puntajes redondos para poder seguirlo de memoria.
 * Los pesos son los vigentes, y el aporte de cada componente se calcula aqui y
 * no se escribe a mano: si el administrador cambia los pesos, el ejemplo se
 * rehace solo y no puede quedar con una suma mal hecha.
 */
function armarEjemplo(pesos) {
  const filas = [
    { nombre: 'Antig\u00fcedad de lo abierto', puntaje: 50, peso: pesos.antiguedad },
    { nombre: 'Tasa de reapertura', puntaje: 100, peso: pesos.reapertura },
    { nombre: 'Reparto por categor\u00eda', puntaje: 80, peso: pesos.reparto },
  ].map((fila) => ({ ...fila, aporte: redondear((fila.puntaje * fila.peso) / 100) }));

  return { filas, indice: redondear(filas.reduce((suma, fila) => suma + fila.aporte, 0)) };
}

/** La etiqueta que le toca a un indice, con la misma regla que el backend. */
function etiquetaDelIndice(indice, umbrales) {
  if (indice >= umbrales.saludable) return 'SALUDABLE';
  if (indice >= umbrales.atencion) return 'ATENCION';
  return 'CRITICO';
}

export default function GuiaSalud() {
  const { limiteDias, limiteReapertura, umbrales } = PARAMETROS;

  const peticion = usePeticion(() => obtenerPesos(), 'guia-pesos');

  if (peticion.error) {
    return (
      <main className="contenedor contenido guia">
        <h1 className="titulo">&iquest;Qu&eacute; es el &iacute;ndice de salud?</h1>
        <p className="alerta alerta--error">
          {peticion.error.message}{' '}
          <button className="enlace-boton" type="button" onClick={peticion.reintentar}>
            Reintentar
          </button>
        </p>
      </main>
    );
  }

  if (!peticion.datos) {
    return (
      <main className="contenedor contenido guia">
        <h1 className="titulo">&iquest;Qu&eacute; es el &iacute;ndice de salud?</h1>
        <p className="estado estado--cargando">Cargando...</p>
      </main>
    );
  }

  const { vigentes } = peticion.datos;
  const pesos = {
    antiguedad: vigentes.antiguedad,
    reapertura: vigentes.reapertura,
    reparto: vigentes.densidad,
  };
  const ejemplo = armarEjemplo(pesos);
  const etiquetaEjemplo = etiquetaDelIndice(ejemplo.indice, umbrales);

  let rangoEjemplo = `queda entre ${umbrales.atencion} y ${umbrales.saludable - 1}`;
  if (etiquetaEjemplo === 'SALUDABLE') rangoEjemplo = `llega a ${umbrales.saludable} o m\u00e1s`;
  if (etiquetaEjemplo === 'CRITICO') rangoEjemplo = `queda bajo ${umbrales.atencion}`;

  return (
    <main className="contenedor contenido guia">
      <p className="guia__volver">
        <Link to="/salud">&larr; Volver al &iacute;ndice de salud</Link>
      </p>

      <h1 className="titulo">&iquest;Qu&eacute; es el &iacute;ndice de salud?</h1>
      <p className="subtitulo">
        Una gu&iacute;a corta para entender el n&uacute;mero y saber qu&eacute; hacer con &eacute;l.
      </p>

      <section className="tarjeta">
        <h2>1. Qu&eacute; es</h2>
        <ul className="guia__lista">
          <li>
            Es <strong>un n&uacute;mero de 0 a 100</strong> que resume c&oacute;mo est&aacute;
            un proyecto seg&uacute;n sus incidencias.
          </li>
          <li>
            <strong>100 es lo mejor</strong> y 0 lo peor: sube cuando las cosas mejoran.
          </li>
          <li>
            Se calcula para cada proyecto y para el sistema completo, siempre con la misma
            regla.
          </li>
        </ul>
      </section>

      <section className="tarjeta">
        <h2>2. Para qu&eacute; sirve</h2>
        <ul className="guia__lista">
          <li>
            <strong>Saber qu&eacute; proyecto atender primero.</strong> En el inicio los
            proyectos aparecen ordenados de peor a mejor.
          </li>
          <li>
            <strong>Ver si un proyecto mejora o empeora</strong> con el tiempo, sin revisar
            incidencia por incidencia.
          </li>
          <li>
            <strong>Saber d&oacute;nde est&aacute; el problema</strong>, porque el n&uacute;mero
            se separa en tres partes y cada una apunta a algo distinto.
          </li>
        </ul>
      </section>

      <section className="tarjeta">
        <h2>3. C&oacute;mo se lee</h2>
        <ul className="guia__niveles">
          <li>
            <span className={claseSalud('SALUDABLE')}>{etiquetaSalud('SALUDABLE')}</span>
            <span>
              {umbrales.saludable} o m&aacute;s. El proyecto est&aacute; al d&iacute;a.
            </span>
          </li>
          <li>
            <span className={claseSalud('ATENCION')}>{etiquetaSalud('ATENCION')}</span>
            <span>
              Entre {umbrales.atencion} y {umbrales.saludable - 1}. Hay algo que revisar
              antes de que crezca.
            </span>
          </li>
          <li>
            <span className={claseSalud('CRITICO')}>{etiquetaSalud('CRITICO')}</span>
            <span>Menos de {umbrales.atencion}. Necesita atenci&oacute;n ahora.</span>
          </li>
          <li>
            <span className={claseSalud('SIN_DATOS')}>{etiquetaSalud('SIN_DATOS')}</span>
            <span>
              Todav&iacute;a no hay incidencias. No se muestra un n&uacute;mero porque no
              habr&iacute;a nada que medir.
            </span>
          </li>
        </ul>
      </section>

      <section className="tarjeta">
        <h2>4. C&oacute;mo se calcula</h2>
        <p>
          El &iacute;ndice junta <strong>tres mediciones</strong>. Cada una da un puntaje de 0 a
          100, y despu&eacute;s se suman seg&uacute;n cu&aacute;nto pesa cada una.
        </p>

        <ol className="guia__componentes">
          <li>
            <h3>
              Antig&uuml;edad de lo abierto <span className="guia__peso">pesa {pesos.antiguedad}%</span>
            </h3>
            <ul className="guia__lista">
              <li>
                <strong>Qu&eacute; mide:</strong> cu&aacute;ntos d&iacute;as llevan, en
                promedio, las incidencias que todav&iacute;a no se cierran.
              </li>
              <li>
                <strong>C&oacute;mo puntea:</strong> 0 d&iacute;as da 100 puntos;{' '}
                {limiteDias} d&iacute;as o m&aacute;s da 0. Por ejemplo, 45 d&iacute;as da 50
                puntos.
              </li>
              <li>
                <strong>Por qu&eacute; importa:</strong> lo que queda abierto mucho tiempo
                se acumula como deuda.
              </li>
            </ul>
          </li>

          <li>
            <h3>
              Tasa de reapertura <span className="guia__peso">pesa {pesos.reapertura}%</span>
            </h3>
            <ul className="guia__lista">
              <li>
                <strong>Qu&eacute; mide:</strong> de todas las incidencias, qu&eacute;
                porcentaje se dio por resuelta y tuvo que reabrirse.
              </li>
              <li>
                <strong>C&oacute;mo puntea:</strong> 0% da 100 puntos; {limiteReapertura}% o
                m&aacute;s da 0. Por ejemplo, 15% da 50 puntos.
              </li>
              <li>
                <strong>Por qu&eacute; importa:</strong> si muchas soluciones fallan, el
                problema est&aacute; en c&oacute;mo se valida antes de resolver.
              </li>
            </ul>
          </li>

          <li>
            <h3>
              Reparto por categor&iacute;a <span className="guia__peso">pesa {pesos.reparto}%</span>
            </h3>
            <ul className="guia__lista">
              <li>
                <strong>Qu&eacute; mide:</strong> si lo que sigue abierto est&aacute;
                repartido entre varias categor&iacute;as o amontonado en una sola.
              </li>
              <li>
                <strong>C&oacute;mo puntea:</strong> repartido parejo entre las seis
                categor&iacute;as da 100 puntos; todo en una sola da 0.
              </li>
              <li>
                <strong>Por qu&eacute; importa:</strong> si casi todo cae en, por ejemplo,
                Seguridad, ah&iacute; hay un problema de fondo que conviene atacar de
                ra&iacute;z.
              </li>
            </ul>
          </li>
        </ol>
      </section>

      <section className="tarjeta">
        <h2>5. Un ejemplo con n&uacute;meros</h2>
        <p>
          Cada puntaje se multiplica por su peso, y los resultados se suman:
        </p>

        <table className="tabla guia__ejemplo">
          <thead>
            <tr>
              <th scope="col">Medici&oacute;n</th>
              <th scope="col" className="tabla__num">Puntaje</th>
              <th scope="col" className="tabla__num">Peso</th>
              <th scope="col" className="tabla__num">Aporta</th>
            </tr>
          </thead>
          <tbody>
            {ejemplo.filas.map((fila) => (
              <tr key={fila.nombre}>
                <td>{fila.nombre}</td>
                <td className="tabla__num">{fila.puntaje}</td>
                <td className="tabla__num">&times; {fila.peso}%</td>
                <td className="tabla__num">{fila.aporte}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                &Iacute;ndice
              </th>
              <td className="tabla__num">
                <strong>{ejemplo.indice}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <p>
          {ejemplo.indice} {rangoEjemplo}, as&iacute; que este proyecto estar&iacute;a en{' '}
          <span className={claseSalud(etiquetaEjemplo)}>{etiquetaSalud(etiquetaEjemplo)}</span>.
          Lo que m&aacute;s lo baja es la antig&uuml;edad, con el puntaje m&aacute;s bajo:
          ah&iacute; conviene actuar primero.
        </p>
      </section>

      <section className="tarjeta">
        <h2>6. Qu&eacute; hacer si el n&uacute;mero sale bajo</h2>
        <p>
          En la pantalla de salud, busca la medici&oacute;n con <strong>menos puntos</strong>:
        </p>
        <ul className="guia__lista">
          <li>
            <strong>Antig&uuml;edad baja:</strong> revisa las incidencias m&aacute;s viejas y
            ci&eacute;rralas, reas&iacute;gnalas o descarta las que ya no aplican.
          </li>
          <li>
            <strong>Reapertura baja:</strong> revisa c&oacute;mo se prueba una soluci&oacute;n
            antes de darla por resuelta.
          </li>
          <li>
            <strong>Reparto bajo:</strong> mira qu&eacute; categor&iacute;a concentra la carga
            y busca la causa com&uacute;n.
          </li>
        </ul>
      </section>

      <section className="tarjeta">
        <h2>7. Sobre los pesos</h2>
        <ul className="guia__lista">
          <li>
            Los pesos ({pesos.antiguedad}%, {pesos.reapertura}% y {pesos.reparto}%) y los
            l&iacute;mites ({limiteDias} d&iacute;as y {limiteReapertura}%) son{' '}
            <strong>una decisi&oacute;n declarada del proyecto</strong>, no algo que salga de
            los datos.
          </li>
          <li>
            Lo que s&iacute; sale de los datos es cada medici&oacute;n, y por eso la pantalla
            de salud muestra la evidencia de cada una.
          </li>
          <li>
            Los pesos son <strong>los mismos para todos los proyectos</strong>, para que se
            puedan comparar entre s&iacute;.
          </li>
          <li>
            El administrador puede cambiarlos en{' '}
            <Link to="/salud/pesos">Pesos del &iacute;ndice</Link>. Cada cambio queda registrado
            con qui&eacute;n lo hizo, cu&aacute;ndo y por qu&eacute;.
          </li>
        </ul>
      </section>

      <p className="guia__volver">
        <Link to="/salud">&larr; Volver al &iacute;ndice de salud</Link>
      </p>
    </main>
  );
}
