/**
 * Tablero de incidencias: una columna por estado y una tarjeta por incidencia.
 *
 * Lo pidio la autora en su revision: la forma de trabajar que conoce un equipo
 * de software es la de un tablero tipo Jira, donde el avance se ve de un
 * vistazo y una incidencia cambia de estado arrastrandola. Reemplaza a la
 * edicion rapida en la tabla que se habia planeado: mover tarjetas es la
 * edicion agil que hacia falta, y el listado sigue existiendo para buscar.
 *
 * ---------------------------------------------------------------------------
 * LA MAQUINA DE ESTADOS SIGUE EN EL SERVIDOR
 *
 * Cada tarjeta trae `transiciones_posibles` desde el backend. Al arrastrar, solo
 * se iluminan esas columnas y solo ahi se puede soltar; el resto se atenua. Si
 * aun asi llegara un movimiento ilegal, el backend responde 409 y el aviso
 * aparece arriba. El tablero no conoce el flujo: lo dibuja.
 *
 * Los rechazos (cerrar sin resolver) exigen motivo. Soltar ahi abre un cuadro
 * para escribirlo antes de enviar, por la misma razon que en el detalle: un
 * cierre sin explicacion deja la bitacora muda.
 *
 * ---------------------------------------------------------------------------
 * UNA PETICION POR COLUMNA
 *
 * Se pide el listado filtrado por cada estado, en paralelo, en vez de todo de
 * una vez y repartirlo aqui. Asi cada columna trae su propio total ("Pendiente
 * 12") aunque muestre solo las primeras, y la de Cerrada puede pedir solo lo
 * cerrado en los ultimos 30 dias: sin ese limite crece sin fin y entierra al
 * resto. Las demas columnas se ordenan por prioridad, lo urgente arriba.
 *
 * ---------------------------------------------------------------------------
 * LOS MISMOS FILTROS QUE LA LISTA
 *
 * Lista y tablero son las dos vistas de una misma seccion (ver
 * SelectorVista.jsx), y por eso filtran con la misma barra y los mismos nombres
 * en la direccion (?id_proyecto=2&asignado_a=yo). Cambiar de vista conserva lo
 * filtrado, y un enlace al tablero de un proyecto se puede compartir. Lo pidio
 * la autora al unir las dos secciones del menu.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import TarjetaIncidencia from '../components/TarjetaIncidencia.jsx';
import { cambiarEstado, listarIncidencias } from '../api/incidencias.js';
import { listarProyectos } from '../api/proyectos.js';
import { listarUsuarios } from '../api/usuarios.js';
import DialogoMotivo from '../components/DialogoMotivo.jsx';
import FiltrosIncidencias from '../components/FiltrosIncidencias.jsx';
import ResumenEstados from '../components/ResumenEstados.jsx';
import ResumenRegistros from '../components/ResumenRegistros.jsx';
import SelectorVista from '../components/SelectorVista.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { consultaParaApi, FILTROS_COMPARTIDOS, parametrosActuales } from '../dominio/filtros.js';
import { accionDe, ESTADOS, etiquetaDe } from '../dominio/incidencias.js';
import { usePeticion } from '../hooks/usePeticion.js';

/** Dias hacia atras que muestra la columna Cerrada. */
const DIAS_CERRADAS = 30;

/** Tarjetas por columna. Las que sobran se ven en el listado. */
const POR_COLUMNA = 50;

/** Pide una columna del tablero, con los filtros de la barra. */
function pedirColumna(estado, consulta) {
  return listarIncidencias({
    ...consulta,
    estado,
    limite: POR_COLUMNA,
    ordenarPor: estado === 'CERRADA' ? 'fecha_creacion' : 'prioridad',
    direccion: 'DESC',
    cerrada_hace_dias: estado === 'CERRADA' ? DIAS_CERRADAS : undefined,
  }).then((respuesta) => ({ estado, ...respuesta }));
}

export default function Tablero() {
  const [parametrosUrl, setParametrosUrl] = useSearchParams();
  const filtros = useMemo(
    () => Object.fromEntries(FILTROS_COMPARTIDOS.map((c) => [c, parametrosUrl.get(c) ?? ''])),
    [parametrosUrl]
  );
  const hayFiltros = FILTROS_COMPARTIDOS.some((campo) => filtros[campo] !== '');

  // "Mis incidencias" (?asignado_a=yo) se traduce al id de quien mira.
  const { usuario } = useSesion();
  const consulta = consultaParaApi(filtros, usuario);

  // Se incrementa tras cada movimiento para volver a pedir las columnas.
  const [version, setVersion] = useState(0);

  // La tarjeta que se esta arrastrando, guardada dos veces y a proposito:
  //   - en el estado, para dibujar: que columnas iluminar y cuales apagar;
  //   - en una referencia, para decidir si se puede soltar.
  // El estado recien se lee en el dibujado siguiente. Si el raton suelta
  // antes, la columna todavia no sabe que se esta arrastrando y rechaza la
  // tarjeta. Lo encontraron las pruebas de interaccion, que arrastran mas
  // rapido que una persona; la referencia se actualiza en el acto.
  const [arrastrada, setArrastrada] = useState(null);
  const arrastradaAhora = useRef(null);
  const [columnaEncima, setColumnaEncima] = useState(null);

  function empezarArrastre(incidencia) {
    arrastradaAhora.current = incidencia;
    setArrastrada(incidencia);
  }

  // Un movimiento que espera su motivo: { incidencia, destino }.
  const [pendiente, setPendiente] = useState(null);

  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const columnas = usePeticion(
    () => Promise.all(ESTADOS.map(({ valor }) => pedirColumna(valor, consulta))),
    `tablero-${JSON.stringify(consulta)}-${version}`
  );
  const proyectos = usePeticion(() => listarProyectos({ limite: 100 }), 'tablero-proyectos');
  const usuarios = usePeticion(() => listarUsuarios({ limite: 100 }), 'tablero-usuarios');

  // Igual que en la lista: un filtro vacio se borra de la direccion, y el
  // buscador reemplaza la entrada del historial en vez de agregar una por
  // pausa. Estable con useCallback porque el buscador de la barra lo usa en un
  // efecto y reiniciaria su espera en cada dibujado.
  const cambiarFiltro = useCallback(
    (campo, valor) => {
      setParametrosUrl(
        (anteriores) => {
          const siguientes = parametrosActuales(anteriores);
          if (valor) siguientes.set(campo, String(valor));
          else siguientes.delete(campo);
          return siguientes;
        },
        { replace: campo === 'busqueda' }
      );
    },
    [setParametrosUrl]
  );

  const limpiarFiltros = useCallback(() => {
    setParametrosUrl((anteriores) => {
      const siguientes = parametrosActuales(anteriores);
      for (const campo of FILTROS_COMPARTIDOS) siguientes.delete(campo);
      return siguientes;
    });
  }, [setParametrosUrl]);

  async function ejecutar(incidencia, destino, comentario = '') {
    setEnviando(true);
    setAviso(null);

    try {
      await cambiarEstado(incidencia.id_incidencia, { estado: destino, comentario });
      setAviso({
        tipo: 'ok',
        texto: `#${incidencia.id_incidencia} pas\u00f3 a ${etiquetaDe(ESTADOS, destino)}.`,
      });
      setVersion((n) => n + 1);
      return true;
    } catch (fallo) {
      setAviso({ tipo: 'error', texto: fallo.message });
      return false;
    } finally {
      setEnviando(false);
    }
  }

  /** Punto de entrada comun del arrastre y del menu "Mover a". */
  function mover(incidencia, destino) {
    if (!incidencia.transiciones_posibles?.includes(destino)) return;

    if (accionDe(incidencia.estado, destino).exigeMotivo) {
      setPendiente({ incidencia, destino });
      return;
    }

    ejecutar(incidencia, destino);
  }

  async function confirmarMotivo(motivo) {
    const funciono = await ejecutar(pendiente.incidencia, pendiente.destino, motivo);
    if (funciono) setPendiente(null);
  }

  function terminarArrastre() {
    arrastradaAhora.current = null;
    setArrastrada(null);
    setColumnaEncima(null);
  }

  const resumenEstados = columnas.datos?.find((c) => c.estado === 'ABIERTA')?.resumen_estados;

  // El total, igual que el de la lista: la suma de las tarjetas por estado,
  // que cuentan con los mismos filtros. No se suman las columnas: la de
  // Cerrada trae solo los ultimos 30 dias y el total saldria corto. El tablero
  // no pagina, asi que se presenta como una sola pagina ("45 incidencias").
  const total = resumenEstados
    ? Object.values(resumenEstados).reduce((suma, n) => suma + n, 0)
    : null;

  const sePuedeSoltar = (estado) =>
    Boolean(arrastradaAhora.current?.transiciones_posibles?.includes(estado));

  return (
    <main className="contenedor contenedor--vistas contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Incidencias</h1>
          <p className="subtitulo">
            Arrastra una tarjeta a otra columna para cambiar su estado.
          </p>
        </div>

        <div className="cabecera__acciones">
          <SelectorVista vista="tablero" />
          <Link className="boton boton--primario boton--auto" to="/incidencias/nueva">
            Nueva incidencia
          </Link>
        </div>
      </header>

      {/* Los mismos numeros y en el mismo lugar que en la lista. Se toman de la
          columna Pendiente: el backend los cuenta con los demas filtros sin
          mirar el estado, y esa peticion no lleva el recorte de 30 dias que
          tiene la de Cerrada. Por eso la tarjeta Cerrada cuenta todas, y la
          columna solo las recientes, como dice su nota. */}
      {resumenEstados && <ResumenEstados resumen={resumenEstados} />}

      <FiltrosIncidencias
        vista="tablero"
        valores={filtros}
        onCambiar={cambiarFiltro}
        onLimpiar={limpiarFiltros}
        hayFiltros={hayFiltros}
        proyectos={proyectos.datos?.datos ?? []}
        usuarios={usuarios.datos?.datos ?? []}
      />

      {aviso && (
        <p className={`alerta alerta--${aviso.tipo === 'ok' ? 'ok' : 'error'}`} role="status">
          {aviso.texto}
        </p>
      )}

      {columnas.error && (
        <p className="alerta alerta--error">
          {columnas.error.message}{' '}
          <button className="enlace-boton" type="button" onClick={columnas.reintentar}>
            Reintentar
          </button>
        </p>
      )}

      {!columnas.datos && !columnas.error && (
        <p className="estado estado--cargando">Cargando el tablero...</p>
      )}

      {total !== null && (
        <ResumenRegistros paginacion={{ total, pagina: 1, limite: total, paginas: 1 }} />
      )}

      {columnas.datos && (
        <div className={`tablero${columnas.cargando ? ' cargando-suave' : ''}`}>
          {columnas.datos.map(({ estado, datos, paginacion }) => {
            let situacion = '';
            if (arrastrada) {
              if (estado === arrastrada.estado) situacion = ' columna--origen';
              else if (sePuedeSoltar(estado)) situacion = ' columna--permitida';
              else situacion = ' columna--bloqueada';
            }
            if (columnaEncima === estado && sePuedeSoltar(estado)) situacion += ' columna--encima';

            return (
              <section
                key={estado}
                className={`columna${situacion}`}
                aria-label={etiquetaDe(ESTADOS, estado)}
                data-estado={estado}
                onDragOver={(evento) => {
                  // Sin preventDefault el navegador no permite soltar: es la
                  // forma de decir "aqui no" en las columnas no permitidas.
                  if (!sePuedeSoltar(estado)) return;
                  evento.preventDefault();
                  setColumnaEncima(estado);
                }}
                onDragLeave={() => setColumnaEncima((actual) => (actual === estado ? null : actual))}
                onDrop={(evento) => {
                  evento.preventDefault();
                  const incidencia = arrastradaAhora.current;
                  terminarArrastre();
                  if (incidencia) mover(incidencia, estado);
                }}
              >
                <header className="columna__cabecera">
                  <h2 className="columna__titulo">{etiquetaDe(ESTADOS, estado)}</h2>
                  <span className="columna__total">{paginacion.total}</span>
                </header>

                {estado === 'CERRADA' && (
                  <p className="columna__nota">
                    &Uacute;ltimos {DIAS_CERRADAS} d&iacute;as &middot;{' '}
                    <Link to="/incidencias?estado=CERRADA">ver todas</Link>
                  </p>
                )}

                <div className="columna__tarjetas">
                  {datos.length === 0 && <p className="columna__vacia">Sin incidencias</p>}

                  {datos.map((incidencia) => (
                    <TarjetaIncidencia
                      key={incidencia.id_incidencia}
                      incidencia={incidencia}
                      onMover={mover}
                      onArrastrar={empezarArrastre}
                      onSoltar={terminarArrastre}
                      deshabilitada={enviando}
                    />
                  ))}
                </div>

                {paginacion.total > datos.length && (
                  <Link className="columna__mas" to={`/incidencias?estado=${estado}`}>
                    y {paginacion.total - datos.length} m&aacute;s en el listado
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      )}

      {pendiente && (
        <DialogoMotivo
          incidencia={pendiente.incidencia}
          destino={pendiente.destino}
          enviando={enviando}
          onConfirmar={confirmarMotivo}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </main>
  );
}
