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
 * El proyecto elegido vive en la direccion (?proyecto=2), como los filtros del
 * listado: el enlace al tablero de un proyecto se puede compartir.
 *
 * ---------------------------------------------------------------------------
 * FILTRO POR PERSONA ASIGNADA
 *
 * Lo pidio la autora: en un tablero cada quien quiere ver primero lo suyo. Se
 * agrego solo este filtro, y no todos los del listado, porque el tablero es
 * para mirar el avance de un vistazo; para buscar con detalle esta el listado.
 *
 * "Mis incidencias" se guarda como ?asignado=yo y no con el id de quien filtra:
 * asi el enlace significa lo mismo para cualquiera que lo abra (sus propias
 * incidencias), en vez de mostrarle a otra persona las de quien lo copio.
 */
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import TarjetaIncidencia from '../components/TarjetaIncidencia.jsx';
import { cambiarEstado, listarIncidencias } from '../api/incidencias.js';
import { listarProyectos } from '../api/proyectos.js';
import { listarUsuarios } from '../api/usuarios.js';
import { useSesion } from '../context/SesionContext.jsx';
import { accionDe, ESTADOS, etiquetaDe } from '../dominio/incidencias.js';
import { usePeticion } from '../hooks/usePeticion.js';

/** Dias hacia atras que muestra la columna Cerrada. */
const DIAS_CERRADAS = 30;

/** Tarjetas por columna. Las que sobran se ven en el listado. */
const POR_COLUMNA = 50;

/** Valor del filtro "Mis incidencias" en la direccion. */
const ASIGNADO_A_MI = 'yo';

/** Pide una columna del tablero. */
function pedirColumna(estado, idProyecto, idAsignado) {
  return listarIncidencias({
    estado,
    id_proyecto: idProyecto,
    asignado_a: idAsignado,
    limite: POR_COLUMNA,
    ordenarPor: estado === 'CERRADA' ? 'fecha_creacion' : 'prioridad',
    direccion: 'DESC',
    cerrada_hace_dias: estado === 'CERRADA' ? DIAS_CERRADAS : undefined,
  }).then((respuesta) => ({ estado, ...respuesta }));
}

export default function Tablero() {
  const [parametrosUrl, setParametrosUrl] = useSearchParams();
  const proyecto = parametrosUrl.get('proyecto') ?? '';
  const asignado = parametrosUrl.get('asignado') ?? '';

  // "yo" se traduce aqui, en el momento de pedir, al id de quien mira.
  const { usuario } = useSesion();
  const idAsignado = asignado === ASIGNADO_A_MI ? String(usuario.id_usuario) : asignado;

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
  const [motivo, setMotivo] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const columnas = usePeticion(
    () => Promise.all(ESTADOS.map(({ valor }) => pedirColumna(valor, proyecto, idAsignado))),
    `tablero-${proyecto}-${idAsignado}-${version}`
  );
  const proyectos = usePeticion(() => listarProyectos({ limite: 100 }), 'tablero-proyectos');
  const usuarios = usePeticion(() => listarUsuarios({ limite: 100 }), 'tablero-usuarios');

  /** Cambia un filtro de la direccion; vacio lo quita. */
  function elegir(campo, valor) {
    setParametrosUrl((anteriores) => {
      const siguientes = new URLSearchParams(anteriores);
      if (valor) siguientes.set(campo, valor);
      else siguientes.delete(campo);
      return siguientes;
    });
  }

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
      setMotivo('');
      setPendiente({ incidencia, destino });
      return;
    }

    ejecutar(incidencia, destino);
  }

  async function confirmarMotivo(evento) {
    evento.preventDefault();
    const funciono = await ejecutar(pendiente.incidencia, pendiente.destino, motivo);
    if (funciono) setPendiente(null);
  }

  function terminarArrastre() {
    arrastradaAhora.current = null;
    setArrastrada(null);
    setColumnaEncima(null);
  }

  const sePuedeSoltar = (estado) =>
    Boolean(arrastradaAhora.current?.transiciones_posibles?.includes(estado));

  return (
    <main className="contenedor contenedor--tablero contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Tablero</h1>
          <p className="subtitulo">
            Arrastra una tarjeta a otra columna para cambiar su estado.
          </p>
        </div>

        <div className="tablero__filtros">
          <label className="campo campo--en-linea">
            <span className="campo__etiqueta">Proyecto</span>
            <select
              className="campo__control"
              value={proyecto}
              onChange={(e) => elegir('proyecto', e.target.value)}
            >
              <option value="">Todos los proyectos</option>
              {(proyectos.datos?.datos ?? []).map((p) => (
                <option key={p.id_proyecto} value={p.id_proyecto}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="campo campo--en-linea">
            <span className="campo__etiqueta">Asignado a</span>
            <select
              className="campo__control"
              value={asignado}
              onChange={(e) => elegir('asignado', e.target.value)}
            >
              <option value="">Todas las personas</option>
              <option value={ASIGNADO_A_MI}>Mis incidencias</option>
              {(usuarios.datos?.datos ?? []).map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

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
        <div className="modal" role="presentation">
          <form
            className="modal__cuadro tarjeta"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-motivo"
            onSubmit={confirmarMotivo}
          >
            <h2 id="titulo-motivo">
              {accionDe(pendiente.incidencia.estado, pendiente.destino).etiqueta} #
              {pendiente.incidencia.id_incidencia}
            </h2>
            <p className="subtitulo">{pendiente.incidencia.titulo}</p>

            <label className="campo">
              <span className="campo__etiqueta">Motivo (obligatorio)</span>
              <textarea
                className="campo__control campo__control--area"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Por ejemplo: duplicada de la #1, no es un defecto, no se reproduce."
                required
                autoFocus
              />
            </label>

            <div className="acciones__confirmar">
              <button className="boton boton--primario boton--auto" type="submit" disabled={enviando}>
                {enviando
                  ? 'Guardando...'
                  : accionDe(pendiente.incidencia.estado, pendiente.destino).etiqueta}
              </button>
              <button
                className="boton boton--discreto boton--auto"
                type="button"
                onClick={() => setPendiente(null)}
                disabled={enviando}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
