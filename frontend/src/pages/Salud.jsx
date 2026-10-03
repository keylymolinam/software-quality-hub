/**
 * Desglose del indice de salud.
 *
 * La pantalla de inicio da el numero; esta explica de donde sale. Existe porque
 * un indice sin desglose solo se puede creer: "73.7" no dice que hacer, y la
 * regla del proyecto es que los tres diferenciadores entreguen siempre la
 * evidencia que justifica su resultado.
 *
 * El orden responde a las preguntas en el orden en que se hacen: cuanto, de que
 * se compone, donde se concentra la carga, y con cuantas incidencias se esta
 * midiendo (un 60 con cinco incidencias no significa lo mismo que con
 * doscientas).
 *
 * ---------------------------------------------------------------------------
 * UNA SOLA PETICION PARA TODOS LOS AMBITOS
 *
 * GET /api/metricas/salud ya devuelve el indice global Y el de cada proyecto,
 * cada uno con su desglose completo. Cambiar de ambito no pide nada al
 * servidor: se elige del mismo objeto que ya llego. Existe tambien
 * /api/metricas/salud/:id, pero usarlo aqui seria pedir otra vez lo que ya
 * esta en memoria.
 *
 * El ambito elegido vive en la direccion (`?proyecto=3`), igual que los filtros
 * del listado: asi el enlace a "la salud del proyecto 3" se puede compartir y
 * el boton atras deshace el cambio.
 */
import { useSearchParams } from 'react-router-dom';

import ComponenteSalud from '../components/ComponenteSalud.jsx';
import EtiquetaEstado from '../components/EtiquetaEstado.jsx';
import EtiquetaPrioridad from '../components/EtiquetaPrioridad.jsx';
import { obtenerSalud } from '../api/metricas.js';
import { CATEGORIAS, etiquetaDe } from '../dominio/incidencias.js';
import { claseSalud, etiquetaSalud } from '../dominio/salud.js';
import { usePeticion } from '../hooks/usePeticion.js';

/** Una proporcion (0 a 1) como porcentaje redondeado, para mostrarla. */
const porcentaje = (proporcion) => `${Math.round(proporcion * 100)}%`;

export default function Salud() {
  const [parametrosUrl, setParametrosUrl] = useSearchParams();

  const proyectoElegido = parametrosUrl.get('proyecto') ?? '';

  const peticion = usePeticion(() => obtenerSalud(), 'salud-desglose');

  function cambiarAmbito(valor) {
    setParametrosUrl((anteriores) => {
      const siguientes = new URLSearchParams(anteriores);

      if (valor === '') {
        siguientes.delete('proyecto');
      } else {
        siguientes.set('proyecto', valor);
      }

      return siguientes;
    });
  }

  if (peticion.error) {
    return (
      <main className="contenedor contenido">
        <h1 className="titulo">&Iacute;ndice de salud</h1>
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
      <main className="contenedor contenido">
        <h1 className="titulo">&Iacute;ndice de salud</h1>
        <p className="estado estado--cargando">Calculando...</p>
      </main>
    );
  }

  const { global, proyectos } = peticion.datos;

  // El ambito elegido sale del mismo objeto que ya llego. Si la direccion
  // trae un proyecto que no existe se cae al global en lugar de dejar la
  // pantalla vacia: una direccion vieja o mal escrita no deberia romper nada.
  const ambito = proyectoElegido
    ? (proyectos.find((p) => String(p.id_proyecto) === proyectoElegido) ?? global)
    : global;

  const { componentes, contexto } = ambito;

  return (
    <main className="contenedor contenedor--ancho contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">&Iacute;ndice de salud</h1>
          <p className="subtitulo">De qu&eacute; se compone y con qu&eacute; evidencia.</p>
        </div>
      </header>

      {/* Un solo selector arriba, que alcanza a todas las tarjetas de abajo.
          Un filtro por tarjeta dejaria la pantalla mostrando a la vez datos de
          ambitos distintos. */}
      <section className="filtros" aria-label="&Aacute;mbito del &iacute;ndice">
        <div className="filtros__fila">
          <label className="campo">
            <span className="campo__etiqueta">&Aacute;mbito</span>
            <select
              className="campo__control"
              value={proyectoElegido}
              onChange={(e) => cambiarAmbito(e.target.value)}
            >
              <option value="">Todo el sistema</option>
              {proyectos.map((proyecto) => (
                <option key={proyecto.id_proyecto} value={proyecto.id_proyecto}>
                  {proyecto.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Se atenua mientras recarga en vez de vaciarse, para que cambiar de
          ambito no produzca un parpadeo. */}
      <div className={peticion.cargando ? 'cargando-suave' : undefined}>
        <section className="tarjeta">
          <h2>{ambito.id_proyecto === null ? 'Todo el sistema' : ambito.nombre}</h2>

          {ambito.datos_suficientes ? (
            <>
              <p className="indice-grande">
                {ambito.indice}
                <span className={claseSalud(ambito.etiqueta)}>{etiquetaSalud(ambito.etiqueta)}</span>
              </p>
              <p className="ayuda ayuda--neutra">
                Los pesos de los tres componentes son una convenci&oacute;n declarada del
                proyecto, no un resultado derivado de los datos. Cambiarlos cambia el
                n&uacute;mero, y por eso van escritos junto a cada uno.
              </p>
            </>
          ) : (
            <>
              <p className="indice-grande">
                <span className={claseSalud('SIN_DATOS')}>{etiquetaSalud('SIN_DATOS')}</span>
              </p>
              <p className="ayuda ayuda--neutra">
                No hay incidencias registradas en este &aacute;mbito, as&iacute; que no hay
                nada que medir. Los tres componentes dar&iacute;an 100 por ausencia de datos
                y eso no es salud: es falta de informaci&oacute;n.
              </p>
            </>
          )}
        </section>

        {ambito.datos_suficientes && (
          <>
            <section className="tarjeta">
              <h2>Los tres componentes</h2>

              <ul className="componentes">
                <ComponenteSalud
                  nombre="Antig&uuml;edad de lo abierto"
                  puntaje={componentes.antiguedad.puntaje}
                  peso={componentes.antiguedad.peso}
                >
                  {componentes.antiguedad.incidencias_abiertas} incidencias siguen abiertas,
                  con {componentes.antiguedad.antiguedad_promedio_dias} d&iacute;as de
                  antig&uuml;edad promedio y {componentes.antiguedad.antiguedad_maxima_dias} la
                  m&aacute;s vieja. A los {componentes.antiguedad.limite_dias} d&iacute;as de
                  promedio este componente vale 0: un trimestre sin cerrarse deja de ser un
                  pendiente y pasa a ser parte del paisaje.
                </ComponenteSalud>

                <ComponenteSalud
                  nombre="Tasa de reapertura"
                  puntaje={componentes.reapertura.puntaje}
                  peso={componentes.reapertura.peso}
                >
                  {componentes.reapertura.incidencias_reabiertas} de{' '}
                  {componentes.reapertura.incidencias_totales} incidencias volvieron a
                  abrirse despu&eacute;s de darse por resueltas, o sea{' '}
                  {porcentaje(componentes.reapertura.tasa)}. El componente vale 0 a partir de{' '}
                  {porcentaje(componentes.reapertura.limite)}: a ese nivel el problema ya no
                  son las incidencias sino el proceso de validaci&oacute;n.
                </ComponenteSalud>

                <ComponenteSalud
                  nombre="Reparto por categor&iacute;a"
                  puntaje={componentes.densidad.puntaje}
                  peso={componentes.densidad.peso}
                >
                  La carga se reparte en {componentes.densidad.categorias_con_carga} de las{' '}
                  {componentes.densidad.de_un_total_de} categor&iacute;as. Mientras m&aacute;s
                  concentrada est&eacute; en una sola, m&aacute;s baja el puntaje: significa
                  que el problema es sist&eacute;mico y no disperso.
                </ComponenteSalud>
              </ul>
            </section>

            <section className="tarjeta">
              <h2>D&oacute;nde est&aacute; la carga</h2>

              {/* Todas las barras del mismo color: miden lo mismo y cada una se
                  identifica por su nombre. El valor va al costado, nunca dentro,
                  para que una categoria con una sola incidencia no quede con el
                  numero recortado. */}
              <Distribucion
                filas={componentes.densidad.reparto.map((fila) => ({
                  clave: fila.categoria,
                  nombre: etiquetaDe(CATEGORIAS, fila.categoria),
                  valor: fila.cantidad,
                }))}
                unidad="incidencias"
              />

              {componentes.densidad.categorias_con_carga <
                componentes.densidad.de_un_total_de && (
                <p className="ayuda ayuda--neutra">
                  Las categor&iacute;as sin incidencias no aparecen. Son{' '}
                  {componentes.densidad.de_un_total_de -
                    componentes.densidad.categorias_con_carga}{' '}
                  de {componentes.densidad.de_un_total_de}.
                </p>
              )}
            </section>

            <section className="tarjeta">
              <h2>Con qu&eacute; se est&aacute; midiendo</h2>

              <div className="fichas">
                <Ficha
                  rotulo="Tiempo medio de resoluci&oacute;n"
                  valor={`${contexto.tiempo_medio_resolucion_dias} d`}
                  nota="Desde que se registra hasta que se resuelve"
                />
                <Ficha
                  rotulo="Clasificadas por el motor"
                  valor={porcentaje(contexto.clasificacion_automatica.proporcion)}
                  nota={`${contexto.clasificacion_automatica.automaticas} de ${contexto.clasificacion_automatica.total} incidencias`}
                />
                <Ficha
                  rotulo="Posibles duplicados"
                  valor={String(contexto.posibles_duplicados)}
                  nota="Marcados por el detector, sin confirmar"
                />
              </div>

              <h3 className="subtitulo-seccion">Por estado</h3>
              <ul className="conteos">
                {contexto.por_estado.map((fila) => (
                  <li className="conteo" key={fila.estado}>
                    <EtiquetaEstado estado={fila.estado} />
                    <span className="conteo__cantidad">{fila.cantidad}</span>
                  </li>
                ))}
              </ul>

              <h3 className="subtitulo-seccion">Prioridad de lo que sigue abierto</h3>
              {contexto.por_prioridad_abiertas.length > 0 ? (
                <ul className="conteos">
                  {contexto.por_prioridad_abiertas.map((fila) => (
                    <li className="conteo" key={fila.prioridad}>
                      <EtiquetaPrioridad prioridad={fila.prioridad} />
                      <span className="conteo__cantidad">{fila.cantidad}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="vacio">No queda nada abierto en este &aacute;mbito.</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

/**
 * Barras horizontales de una distribucion.
 *
 * Vive en este archivo porque solo la usa esta pantalla. Las filas llegan ya
 * ordenadas por el backend (de mayor a menor) y no se reordenan aqui.
 *
 * El largo se mide contra el valor mayor y no contra el total: lo que interesa
 * es comparar las categorias entre si, y con el total como referencia todas las
 * barras quedarian diminutas cuando hay muchas categorias.
 */
function Distribucion({ filas, unidad }) {
  if (filas.length === 0) {
    return <p className="vacio">Sin datos para repartir.</p>;
  }

  const mayor = Math.max(...filas.map((f) => f.valor));

  return (
    <ul className="distribucion">
      {filas.map((fila) => (
        <li className="distribucion__fila" key={fila.clave}>
          <span className="distribucion__nombre">{fila.nombre}</span>

          <div
            className="barra barra--delgada"
            role="img"
            aria-label={`${fila.nombre}: ${fila.valor} ${unidad}`}
          >
            <div
              className="barra__relleno"
              style={{ width: `${mayor === 0 ? 0 : (fila.valor / mayor) * 100}%` }}
            />
          </div>

          <span className="distribucion__valor">{fila.valor}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Una cifra de contexto con su rotulo.
 *
 * No lleva barra ni grafico: es un solo numero, y un grafico de un solo dato
 * ocupa espacio sin agregar nada que el numero no diga.
 */
function Ficha({ rotulo, valor, nota }) {
  return (
    <div className="ficha">
      <span className="ficha__rotulo">{rotulo}</span>
      <strong className="ficha__valor">{valor}</strong>
      <span className="ficha__nota">{nota}</span>
    </div>
  );
}
