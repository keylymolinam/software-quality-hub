/**
 * Detalle de una incidencia.
 *
 * Es la pantalla donde el flujo de trabajo del sistema se puede recorrer
 * completo: se ve lo que se reporto, se cambia el estado por las vias que la
 * maquina de estados permite, y se lee la bitacora que deja cada cambio. Sin
 * ella la API tiene una maquina de estados que nadie puede accionar.
 *
 * Tambien es donde los diferenciadores dejan de ser una marca en una tabla y
 * se explican: si la clasificacion la dedujo el motor se dice, y si el detector
 * encontro un parecido se enlaza la incidencia original para poder compararlas.
 *
 * ---------------------------------------------------------------------------
 * POR QUE SE VUELVE A PEDIR TODO DESPUES DE UNA TRANSICION
 *
 * La respuesta de la transicion ya trae la incidencia actualizada, asi que
 * podria pintarse directamente. No se hace: `version` cambia y las dos
 * peticiones se repiten.
 *
 * El motivo es que la pantalla muestra dos cosas que tienen que concordar, la
 * incidencia y su bitacora, y la transicion solo devuelve la primera. Pintando
 * la respuesta habria que pedir el historial igual, con el riesgo de que uno de
 * los dos quedara de la peticion anterior. Una sola fuente, aunque cueste una
 * peticion mas, no puede contradecirse a si misma.
 */
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EtiquetaEstado from '../components/EtiquetaEstado.jsx';
import EtiquetaPrioridad from '../components/EtiquetaPrioridad.jsx';
import LineaTiempo from '../components/LineaTiempo.jsx';
import PanelTransicion from '../components/PanelTransicion.jsx';
import { cambiarEstado, obtenerHistorial, obtenerIncidencia } from '../api/incidencias.js';
import { CATEGORIAS, etiquetaDe, formatearFechaHora } from '../dominio/incidencias.js';
import { usePeticion } from '../hooks/usePeticion.js';

export default function DetalleIncidencia() {
  const { id } = useParams();

  // Se incrementa despues de cada transicion para que las dos peticiones se
  // vuelvan a lanzar. Es el mecanismo que ofrece usePeticion: cambiar la clave.
  const [version, setVersion] = useState(0);

  const [enviando, setEnviando] = useState(false);
  const [errorTransicion, setErrorTransicion] = useState(null);

  const incidencia = usePeticion(() => obtenerIncidencia(id), `incidencia-${id}-${version}`);

  const historial = usePeticion(() => obtenerHistorial(id), `historial-${id}-${version}`);

  /**
   * Ejecuta una transicion y devuelve si funciono.
   *
   * El valor de retorno es lo que el panel necesita para decidir si limpia su
   * formulario o lo deja como estaba para corregir el motivo.
   */
  const ejecutarTransicion = useCallback(
    async ({ estado, comentario }) => {
      setErrorTransicion(null);
      setEnviando(true);

      try {
        await cambiarEstado(id, { estado, comentario });
        setVersion((n) => n + 1);
        return true;
      } catch (fallo) {
        // Los 409 llegan aqui: la transicion dejo de ser legal porque otra
        // persona movio la incidencia mientras esta pantalla estaba abierta. El
        // mensaje del backend ya explica el estado actual y lo que se puede
        // hacer, asi que se muestra tal cual.
        setErrorTransicion(fallo);
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [id]
  );

  if (incidencia.cargando && !incidencia.datos) {
    return (
      <main className="contenedor contenido">
        <p className="estado estado--cargando">Cargando la incidencia...</p>
      </main>
    );
  }

  // El 404 se trata aparte del resto de los errores. "No existe la incidencia
  // 999" no se arregla reintentando, y ofrecer ese boton seria mandar a la
  // persona a repetir algo que va a fallar igual; lo que necesita es volver al
  // listado.
  if (incidencia.error?.status === 404) {
    return (
      <main className="contenedor contenido">
        <h1 className="titulo">Incidencia #{id}</h1>
        <p className="alerta alerta--error">{incidencia.error.message}</p>
        <Link className="boton boton--discreto boton--auto" to="/incidencias">
          Volver al listado
        </Link>
      </main>
    );
  }

  if (incidencia.error) {
    return (
      <main className="contenedor contenido">
        <p className="alerta alerta--error">
          {incidencia.error.message}{' '}
          <button className="enlace-boton" type="button" onClick={incidencia.reintentar}>
            Reintentar
          </button>
        </p>
      </main>
    );
  }

  const datos = incidencia.datos;

  return (
    <main className="contenedor contenedor--ancho contenido">
      <header className="contenido__cabecera">
        <div>
          <p className="migas">
            <Link to="/incidencias">Incidencias</Link> &middot; #{datos.id_incidencia}
          </p>
          <h1 className="titulo">{datos.titulo}</h1>
          <div className="detalle__distintivos">
            <EtiquetaEstado estado={datos.estado} />
            <EtiquetaPrioridad prioridad={datos.prioridad} />
            <span className="detalle__categoria">{etiquetaDe(CATEGORIAS, datos.categoria)}</span>
          </div>
        </div>

        <Link className="boton boton--discreto boton--auto" to="/incidencias">
          Volver al listado
        </Link>
      </header>

      {/* Lo que aportaron los diferenciadores va arriba, antes de los datos:
          cambia como se lee todo lo demas. Saber que la categoria la dedujo el
          motor, o que esto quizas ya estaba reportado, condiciona lo que se
          decida con esta incidencia. */}
      {(datos.clasificacion_automatica === 1 || datos.posible_duplicado_de) && (
        <div className="detalle__senales">
          {datos.posible_duplicado_de && (
            <p className="alerta alerta--aviso">
              <strong>Posible duplicado.</strong> El detector encontr&oacute; un parecido con la
              incidencia{' '}
              <Link to={`/incidencias/${datos.posible_duplicado_de}`}>
                #{datos.posible_duplicado_de}
              </Link>
              . Es un aviso, no una certeza: comp&aacute;ralas antes de cerrar esta. Si son la
              misma falla, cerrarla sin resolver deja el motivo en la bit&aacute;cora.
            </p>
          )}

          {datos.clasificacion_automatica === 1 && (
            <p className="ayuda ayuda--neutra">
              La categor&iacute;a y la prioridad las dedujo el motor de clasificaci&oacute;n,
              porque se registr&oacute; sin indicarlas. Se pueden corregir: una decisi&oacute;n
              humana nunca se sobreescribe.
            </p>
          )}
        </div>
      )}

      <div className="detalle-con-panel">
        <div>
          <section className="tarjeta">
            <h2>Descripci&oacute;n</h2>
            {/* El texto se respeta tal como se escribio: los saltos de linea de
                una descripcion suelen separar los pasos para reproducir el
                problema, y colapsarlos convierte una lista en un parrafo. */}
            <p className="detalle__descripcion">{datos.descripcion}</p>
          </section>

          <section className="tarjeta">
            <h2>Datos</h2>
            <dl className="detalle detalle--texto">
              <dt>Proyecto</dt>
              <dd>{datos.proyecto_nombre}</dd>

              <dt>Reportada por</dt>
              <dd>{datos.reportado_por_nombre}</dd>

              <dt>Asignada a</dt>
              <dd>{datos.asignado_a_nombre ?? <span className="sin-dato">Sin asignar</span>}</dd>

              <dt>Registrada</dt>
              <dd>{formatearFechaHora(datos.fecha_creacion)}</dd>

              {/* Solo cuando existe. Una incidencia abierta no tiene fecha de
                  resolucion, y una fila con un guion invita a preguntarse si
                  falta el dato. */}
              {datos.fecha_resolucion && (
                <>
                  <dt>Resuelta</dt>
                  <dd>{formatearFechaHora(datos.fecha_resolucion)}</dd>
                </>
              )}

              <dt>Clasificaci&oacute;n</dt>
              <dd>
                {datos.clasificacion_automatica === 1
                  ? 'Deducida por el motor'
                  : 'Indicada por una persona'}
              </dd>
            </dl>
          </section>

          <section className="tarjeta">
            <h2>Bit&aacute;cora</h2>

            {historial.error && (
              <p className="alerta alerta--error">
                {historial.error.message}{' '}
                <button className="enlace-boton" type="button" onClick={historial.reintentar}>
                  Reintentar
                </button>
              </p>
            )}

            {/* Se atenua en lugar de desaparecer mientras se recarga, para que
                la bitacora no parpadee tras cada cambio de estado. */}
            {historial.datos && (
              <div className={historial.cargando ? 'cargando-suave' : undefined}>
                <LineaTiempo movimientos={historial.datos.movimientos} />
              </div>
            )}

            {historial.cargando && !historial.datos && (
              <p className="estado estado--cargando">Cargando la bit&aacute;cora...</p>
            )}
          </section>
        </div>

        <div className="detalle__panel">
          {/* El error de la transicion se muestra fuera del panel cuando no es
              del formulario: un 409 significa que el estado cambio por detras,
              y entonces lo que hay que mirar es el estado nuevo, no el motivo
              que se habia escrito. */}
          {errorTransicion && !errorTransicion.mensajeDe('comentario') && (
            <p className="alerta alerta--error">{errorTransicion.message}</p>
          )}

          <PanelTransicion
            estado={datos.estado}
            transicionesPosibles={datos.transiciones_posibles ?? []}
            onEjecutar={ejecutarTransicion}
            enviando={enviando}
            error={errorTransicion}
          />
        </div>
      </div>
    </main>
  );
}
