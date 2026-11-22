/**
 * Listado de incidencias.
 *
 * Es la pantalla principal del sistema: la tarea diaria de cualquier rol es
 * buscar incidencias y ver como van.
 *
 * ---------------------------------------------------------------------------
 * LOS FILTROS VIVEN EN LA DIRECCION, NO EN EL ESTADO
 *
 * El estado de esta pantalla (que se filtro, que orden, que pagina) se guarda
 * en la cadena de consulta del navegador:
 *
 *     /incidencias?estado=ABIERTA&prioridad=ALTA&pagina=2
 *
 * Cuesta lo mismo que un useState y da tres cosas gratis:
 *
 *   - La direccion se puede compartir. "Mira las criticas abiertas del proyecto
 *     3" pasa a ser un enlace, y no una lista de instrucciones para que la otra
 *     persona reproduzca los filtros a mano.
 *   - El boton atras del navegador deshace el ultimo filtro, que es lo que
 *     cualquiera espera que haga.
 *   - Recargar la pagina no pierde el trabajo de haber filtrado.
 *
 * La consecuencia es que no hay un segundo lugar donde viva la verdad: lo que
 * muestra la tabla se deriva siempre de la direccion, y no pueden discrepar.
 */
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import FiltrosIncidencias from '../components/FiltrosIncidencias.jsx';
import Paginacion from '../components/Paginacion.jsx';
import ResumenRegistros from '../components/ResumenRegistros.jsx';
import SelectorVista from '../components/SelectorVista.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { consultaParaApi, parametrosActuales } from '../dominio/filtros.js';
import { accionDe, ESTADOS, etiquetaDe, PRIORIDADES } from '../dominio/incidencias.js';
import ResumenEstados from '../components/ResumenEstados.jsx';
import TablaIncidencias from '../components/TablaIncidencias.jsx';
import DialogoMotivo from '../components/DialogoMotivo.jsx';
import { actualizarIncidencia, cambiarEstado, listarIncidencias } from '../api/incidencias.js';
import { listarProyectos } from '../api/proyectos.js';
import { listarUsuarios } from '../api/usuarios.js';
import { usePeticion } from '../hooks/usePeticion.js';

/**
 * Filtros que se pueden limpiar, y que cuentan para decidir si "hay filtros".
 *
 * El orden y la pagina quedan fuera a proposito: siempre tienen algun valor, no
 * son algo que se pueda quitar, y no explican que un listado salga vacio.
 */
const CAMPOS_FILTRABLES = [
  'busqueda',
  'estado',
  'prioridad',
  'categoria',
  'id_proyecto',
  'asignado_a',
  'posible_duplicado',
];

export default function Incidencias() {
  const [parametrosUrl, setParametrosUrl] = useSearchParams();

  // Los valores que la pantalla va a usar, ya con sus valores por defecto. Se
  // lee todo como texto porque eso es lo que hay en una direccion; el backend
  // convierte y valida.
  const filtros = useMemo(
    () => ({
      busqueda: parametrosUrl.get('busqueda') ?? '',
      estado: parametrosUrl.get('estado') ?? '',
      prioridad: parametrosUrl.get('prioridad') ?? '',
      categoria: parametrosUrl.get('categoria') ?? '',
      id_proyecto: parametrosUrl.get('id_proyecto') ?? '',
      asignado_a: parametrosUrl.get('asignado_a') ?? '',
      posible_duplicado: parametrosUrl.get('posible_duplicado') ?? '',
      ordenarPor: parametrosUrl.get('ordenarPor') ?? 'fecha_creacion',
      direccion: parametrosUrl.get('direccion') ?? 'DESC',
      pagina: parametrosUrl.get('pagina') ?? '1',
    }),
    [parametrosUrl]
  );

  const hayFiltros = CAMPOS_FILTRABLES.some((campo) => filtros[campo] !== '');

  /**
   * Cambia un filtro escribiendolo en la direccion.
   *
   * Se usa la forma de funcion de setParametrosUrl (recibe los parametros
   * anteriores) para que este callback no dependa de ellos. Asi su identidad no
   * cambia en cada render, que es lo que necesita el efecto del buscador dentro
   * de FiltrosIncidencias para no reiniciar su temporizador constantemente.
   */
  const cambiarFiltro = useCallback(
    (campo, valor) => {
      setParametrosUrl(
        (anteriores) => {
          const siguientes = parametrosActuales(anteriores);

          // Un filtro vacio se borra de la direccion en vez de quedar como
          // `estado=`. La direccion se mantiene legible y dice exactamente que
          // filtros estan puestos.
          if (valor === '' || valor === null || valor === undefined) {
            siguientes.delete(campo);
          } else {
            siguientes.set(campo, String(valor));
          }

          // Al cambiar cualquier filtro se vuelve a la primera pagina. Sin
          // esto, alguien que esta en la pagina 5 y filtra por SEGURIDAD veria
          // una tabla vacia: hay resultados, pero no tantos como para llegar a
          // la pagina 5.
          if (campo !== 'pagina') {
            siguientes.delete('pagina');
          }

          return siguientes;
        },
        // El buscador reemplaza la entrada del historial en vez de agregar una.
        // Escribir "autenticacion" con pausas generaria varias entradas, y el
        // boton atras tendria que pulsarse una vez por pausa para salir de la
        // pantalla. Los demas filtros si agregan entrada: son acciones
        // deliberadas, y poder deshacerlas con atras es util.
        { replace: campo === 'busqueda' }
      );
    },
    [setParametrosUrl]
  );

  /**
   * Deja la lista como viene: sin filtros, en la primera pagina y con el orden
   * de siempre. Antes conservaba el orden elegido, por no ser un filtro; se
   * cambio cuando el boton paso a estar siempre a la vista, porque quien lo
   * pulsa espera ver la pantalla como al entrar, y "Mas filtros" ya contaba el
   * orden como uno mas.
   */
  const limpiarFiltros = useCallback(() => {
    setParametrosUrl((anteriores) => {
      const siguientes = parametrosActuales(anteriores);

      for (const campo of [...CAMPOS_FILTRABLES, 'pagina', 'ordenarPor', 'direccion']) {
        siguientes.delete(campo);
      }

      return siguientes;
    });
  }, [setParametrosUrl]);

  // La clave le dice al hook cuando volver a pedir: cuando cambie cualquiera de
  // los valores que forman la consulta.
  // "Mis incidencias" llega como ?asignado_a=yo y se traduce aqui al id de
  // quien mira (ver dominio/filtros.js).
  const { usuario } = useSesion();
  const resultado = usePeticion(
    () => listarIncidencias(consultaParaApi(filtros, usuario)),
    JSON.stringify(filtros)
  );

  // Proyectos y usuarios alimentan los desplegables de filtro. Se piden una
  // sola vez (la clave es constante) porque no cambian mientras se navega el
  // listado, y volver a pedirlos con cada filtro seria trabajo inutil.
  const referencias = usePeticion(
    () => Promise.all([listarProyectos({ limite: 100 }), listarUsuarios({ limite: 100 })]),
    'referencias-de-filtro'
  );

  const [proyectos, usuarios] = referencias.datos ?? [null, null];

  // --- Edicion desde la tabla ------------------------------------------------
  // La tabla avisa que se eligio algo; aqui se guarda, se informa y se vuelve
  // a pedir el listado, para que la fila, las tarjetas por estado y el orden
  // reflejen el cambio. Mientras se guarda, los desplegables se desactivan:
  // dos cambios encadenados sobre una fila vieja podrian pisarse.
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  // Un cambio de estado que espera su motivo: { incidencia, destino }.
  const [pendiente, setPendiente] = useState(null);

  async function guardar(accion, textoOk) {
    setEnviando(true);
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: 'ok', texto: textoOk });
      resultado.reintentar();
      return true;
    } catch (fallo) {
      setAviso({ tipo: 'error', texto: fallo.message });
      return false;
    } finally {
      setEnviando(false);
    }
  }

  function actualizarFila(incidencia, cambios) {
    const id = incidencia.id_incidencia;
    let texto;
    if ('prioridad' in cambios) {
      texto = `#${id} ahora tiene prioridad ${etiquetaDe(PRIORIDADES, cambios.prioridad)}.`;
    } else if (cambios.asignado_a === null) {
      texto = `#${id} qued\u00f3 sin asignar.`;
    } else {
      const persona = usuarios?.datos?.find((u) => u.id_usuario === cambios.asignado_a);
      texto = `#${id} qued\u00f3 asignada a ${persona?.nombre ?? 'otra persona'}.`;
    }
    guardar(() => actualizarIncidencia(id, cambios), texto);
  }

  function cambiarEstadoFila(incidencia, destino, comentario = '') {
    return guardar(
      () => cambiarEstado(incidencia.id_incidencia, { estado: destino, comentario }),
      `#${incidencia.id_incidencia} pas\u00f3 a ${etiquetaDe(ESTADOS, destino)}.`
    );
  }

  function elegirEstado(incidencia, destino) {
    if (accionDe(incidencia.estado, destino).exigeMotivo) {
      setPendiente({ incidencia, destino });
      return;
    }
    cambiarEstadoFila(incidencia, destino);
  }

  async function confirmarMotivo(motivo) {
    const funciono = await cambiarEstadoFila(pendiente.incidencia, pendiente.destino, motivo);
    if (funciono) setPendiente(null);
  }

  // Si se entro a un proyecto (desde el menu o con el filtro), el subtitulo lo
  // nombra: con la columna Proyecto convertida en una linea chica, sin esto
  // costaria saber a primera vista que el listado esta acotado.
  const proyectoActual = proyectos?.datos?.find(
    (proyecto) => String(proyecto.id_proyecto) === filtros.id_proyecto
  );

  return (
    <main className="contenedor contenedor--vistas contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Incidencias</h1>
          <p className="subtitulo">
            {proyectoActual ? (
              <>
                Proyecto <strong>{proyectoActual.nombre}</strong>
              </>
            ) : (
              <>Listado completo, con filtros, b&uacute;squeda y orden.</>
            )}
          </p>
        </div>

        <div className="cabecera__acciones">
          <SelectorVista vista="lista" />

          {/* Es un enlace y no un boton porque lleva a otra direccion. Parece un
              boton porque es la accion principal de esta pantalla, pero se
              comporta como enlace: se puede abrir en otra pestana. */}
          <Link className="boton boton--primario boton--auto" to="/incidencias/nueva">
            Nueva incidencia
          </Link>
        </div>
      </header>

      {/* El resumen aparece con la primera respuesta y despues se mantiene,
          igual que la tabla, mientras llega la siguiente. */}
      {resultado.datos?.resumen_estados && (
        <ResumenEstados
          resumen={resultado.datos.resumen_estados}
          estadoActivo={filtros.estado}
          onElegir={(estado) => cambiarFiltro('estado', estado)}
        />
      )}

      <FiltrosIncidencias
        valores={filtros}
        onCambiar={cambiarFiltro}
        onLimpiar={limpiarFiltros}
        hayFiltros={hayFiltros}
        // Hasta que lleguen, los desplegables de proyecto y usuario se dibujan
        // vacios en lugar de esconder toda la barra: los demas filtros ya
        // funcionan y no tienen por que esperarlos.
        proyectos={proyectos?.datos ?? []}
        usuarios={usuarios?.datos ?? []}
      />

      {aviso && (
        <p className={`alerta alerta--${aviso.tipo}`} role="status">
          {aviso.texto}
        </p>
      )}

      {resultado.error && (
        <p className="alerta alerta--error">
          {resultado.error.message}{' '}
          <button className="enlace-boton" type="button" onClick={resultado.reintentar}>
            Reintentar
          </button>
        </p>
      )}

      {/* Mientras carga se mantiene la tabla anterior a la vista y solo se
          atenua, en lugar de reemplazarla por un "Cargando...". Cambiar un
          filtro tarda decimas de segundo, y vaciar la pantalla en cada cambio
          produce un parpadeo que cuesta mas de leer que esperar. */}
      {resultado.datos && (
        <div className={resultado.cargando ? 'cargando-suave' : undefined}>
          <ResumenRegistros paginacion={resultado.datos.paginacion} />

          <TablaIncidencias
            incidencias={resultado.datos.datos}
            hayFiltros={hayFiltros}
            usuarios={usuarios?.datos ?? []}
            onActualizar={actualizarFila}
            onCambiarEstado={elegirEstado}
            ocupada={enviando}
          />

          <Paginacion
            paginacion={resultado.datos.paginacion}
            onCambiarPagina={(pagina) => cambiarFiltro('pagina', pagina)}
          />
        </div>
      )}

      {/* Solo la primera carga muestra este mensaje: despues ya hay tabla que
          mantener a la vista. */}
      {resultado.cargando && !resultado.datos && (
        <p className="estado estado--cargando">Cargando incidencias...</p>
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
