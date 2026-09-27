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
import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import FiltrosIncidencias from '../components/FiltrosIncidencias.jsx';
import Paginacion from '../components/Paginacion.jsx';
import TablaIncidencias from '../components/TablaIncidencias.jsx';
import { listarIncidencias } from '../api/incidencias.js';
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
          const siguientes = new URLSearchParams(anteriores);

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

  /** Quita los filtros pero conserva el orden elegido, que no es un filtro. */
  const limpiarFiltros = useCallback(() => {
    setParametrosUrl((anteriores) => {
      const siguientes = new URLSearchParams(anteriores);

      for (const campo of [...CAMPOS_FILTRABLES, 'pagina']) {
        siguientes.delete(campo);
      }

      return siguientes;
    });
  }, [setParametrosUrl]);

  // La clave le dice al hook cuando volver a pedir: cuando cambie cualquiera de
  // los valores que forman la consulta.
  const resultado = usePeticion(() => listarIncidencias(filtros), JSON.stringify(filtros));

  // Proyectos y usuarios alimentan los desplegables de filtro. Se piden una
  // sola vez (la clave es constante) porque no cambian mientras se navega el
  // listado, y volver a pedirlos con cada filtro seria trabajo inutil.
  const referencias = usePeticion(
    () => Promise.all([listarProyectos({ limite: 100 }), listarUsuarios({ limite: 100 })]),
    'referencias-de-filtro'
  );

  const [proyectos, usuarios] = referencias.datos ?? [null, null];

  return (
    <main className="contenedor contenedor--ancho contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Incidencias</h1>
          <p className="subtitulo">
            Listado completo, con filtros, busqueda y orden.
          </p>
        </div>

        {/* Es un enlace y no un boton porque lleva a otra direccion. Parece un
            boton porque es la accion principal de esta pantalla, pero se
            comporta como enlace: se puede abrir en otra pestana. */}
        <Link className="boton boton--primario boton--auto" to="/incidencias/nueva">
          Nueva incidencia
        </Link>
      </header>

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
          <TablaIncidencias incidencias={resultado.datos.datos} hayFiltros={hayFiltros} />

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
    </main>
  );
}
