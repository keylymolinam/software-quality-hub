/**
 * Proyectos: el listado y su administracion.
 *
 * ---------------------------------------------------------------------------
 * UNA SOLA PANTALLA, NO UNA SECCION DE ADMINISTRACION APARTE
 *
 * Ver que proyectos existen y como van le sirve a cualquier rol, y la API lo
 * permite: listar no exige ser administrador. Lo que si lo exige es crear,
 * modificar y eliminar. Por eso la pantalla es una sola y las acciones aparecen
 * segun el rol, en vez de haber una pantalla publica y otra escondida con la
 * misma tabla repetida.
 *
 * El rol se comprueba igual en el servidor: esconder un boton no es seguridad,
 * es cortesia. Lo que evita es ofrecer algo que iba a responder 403.
 *
 * ---------------------------------------------------------------------------
 * EL FORMULARIO VIVE AQUI Y NO EN OTRA RUTA
 *
 * Crear o editar un proyecto son cuatro campos, y lo que se escribe se compara
 * contra la tabla que esta al lado (dos proyectos no deberian llamarse
 * parecido). Mandar eso a otra pantalla obligaria a volver para comprobarlo.
 * Las incidencias si tienen pantalla propia para el registro, porque ahi el
 * formulario trae el panel de clasificacion y no cabe en una tabla.
 */
import { useState } from 'react';

import Campo from '../components/Campo.jsx';
import {
  actualizarProyecto,
  crearProyecto,
  eliminarProyecto,
  listarProyectos,
} from '../api/proyectos.js';
import { ESTADOS_PROYECTO, etiquetaEstadoProyecto } from '../dominio/proyectos.js';
import { useSesion } from '../context/SesionContext.jsx';
import { usePeticion } from '../hooks/usePeticion.js';

const LARGO_NOMBRE = { min: 3, max: 100 };
const LARGO_DESCRIPCION = { min: 10, max: 1000 };

/** Valores de un formulario vacio, para crear. */
const EN_BLANCO = { nombre: '', descripcion: '', fecha_inicio: '', estado: 'ACTIVO' };

/** Pasa un proyecto del backend a los valores del formulario, todos texto. */
function aFormulario(proyecto) {
  return {
    nombre: proyecto.nombre,
    descripcion: proyecto.descripcion ?? '',
    fecha_inicio: proyecto.fecha_inicio ?? '',
    estado: proyecto.estado,
  };
}

export default function Proyectos() {
  const { esAdministrador } = useSesion();

  const [version, setVersion] = useState(0);

  // null = no hay formulario abierto. 'nuevo' = creando. Un numero = editando
  // ese proyecto. Un solo estado para las tres situaciones, porque son
  // excluyentes: no se puede estar creando y editando a la vez.
  const [editando, setEditando] = useState(null);
  const [valores, setValores] = useState(EN_BLANCO);

  const [confirmando, setConfirmando] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const peticion = usePeticion(
    () => listarProyectos({ limite: 100 }),
    `proyectos-${version}`
  );

  function abrirNuevo() {
    setError(null);
    setEditando('nuevo');
    setValores(EN_BLANCO);
  }

  function abrirEdicion(proyecto) {
    setError(null);
    setEditando(proyecto.id_proyecto);
    setValores(aFormulario(proyecto));
  }

  function cerrarFormulario() {
    setEditando(null);
    setValores(EN_BLANCO);
    setError(null);
  }

  async function guardar(evento) {
    evento.preventDefault();

    setError(null);
    setEnviando(true);

    try {
      if (editando === 'nuevo') {
        await crearProyecto(valores);
      } else {
        // Al modificar, un campo que se dejo en blanco se envia como null para
        // borrarlo. Omitirlo le diria al backend que no lo toque, y entonces
        // una descripcion no se podria quitar nunca.
        await actualizarProyecto(editando, {
          ...valores,
          descripcion: valores.descripcion === '' ? null : valores.descripcion,
          fecha_inicio: valores.fecha_inicio === '' ? null : valores.fecha_inicio,
        });
      }

      cerrarFormulario();
      setVersion((n) => n + 1);
    } catch (fallo) {
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(idProyecto) {
    setError(null);
    setEnviando(true);

    try {
      await eliminarProyecto(idProyecto);
      setConfirmando(null);
      setVersion((n) => n + 1);
    } catch (fallo) {
      // El 409 llega aqui cuando el proyecto tiene incidencias. El mensaje del
      // backend ya explica el motivo y sugiere pasarlo a FINALIZADO, asi que se
      // muestra tal cual.
      setError(fallo);
      setConfirmando(null);
    } finally {
      setEnviando(false);
    }
  }

  const proyectos = peticion.datos?.datos ?? [];

  return (
    <main className="contenedor contenedor--ancho contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Proyectos</h1>
          <p className="subtitulo">
            {esAdministrador
              ? 'Crea, modifica y da de baja los proyectos del sistema.'
              : 'Los proyectos del sistema y cuanto tienen pendiente.'}
          </p>
        </div>

        {esAdministrador && editando === null && (
          <button className="boton boton--primario boton--auto" type="button" onClick={abrirNuevo}>
            Nuevo proyecto
          </button>
        )}
      </header>

      {error && <p className="alerta alerta--error">{error.message}</p>}

      {editando !== null && (
        <form className="tarjeta" onSubmit={guardar}>
          <h2>{editando === 'nuevo' ? 'Nuevo proyecto' : 'Editar proyecto'}</h2>

          <Campo
            etiqueta="Nombre"
            ayuda={`Entre ${LARGO_NOMBRE.min} y ${LARGO_NOMBRE.max} caracteres`}
            error={error?.mensajeDe('nombre')}
          >
            <input
              className="campo__control"
              type="text"
              value={valores.nombre}
              onChange={(e) => setValores({ ...valores, nombre: e.target.value })}
              maxLength={LARGO_NOMBRE.max}
              autoFocus
              required
            />
          </Campo>

          <Campo
            etiqueta="Descripci&oacute;n"
            ayuda={`Opcional, desde ${LARGO_DESCRIPCION.min} caracteres si se escribe`}
            error={error?.mensajeDe('descripcion')}
          >
            <textarea
              className="campo__control campo__control--area"
              value={valores.descripcion}
              onChange={(e) => setValores({ ...valores, descripcion: e.target.value })}
              maxLength={LARGO_DESCRIPCION.max}
              rows={3}
            />
          </Campo>

          <div className="campos-en-fila">
            <Campo
              etiqueta="Fecha de inicio"
              ayuda="Opcional"
              error={error?.mensajeDe('fecha_inicio')}
            >
              <input
                className="campo__control"
                type="date"
                value={valores.fecha_inicio}
                onChange={(e) => setValores({ ...valores, fecha_inicio: e.target.value })}
              />
            </Campo>

            <Campo etiqueta="Estado" error={error?.mensajeDe('estado')}>
              <select
                className="campo__control"
                value={valores.estado}
                onChange={(e) => setValores({ ...valores, estado: e.target.value })}
              >
                {ESTADOS_PROYECTO.map((estado) => (
                  <option key={estado.valor} value={estado.valor}>
                    {estado.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="acciones__confirmar">
            <button className="boton boton--primario boton--auto" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              className="boton boton--discreto boton--auto"
              type="button"
              onClick={cerrarFormulario}
              disabled={enviando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {peticion.error && (
        <p className="alerta alerta--error">
          {peticion.error.message}{' '}
          <button className="enlace-boton" type="button" onClick={peticion.reintentar}>
            Reintentar
          </button>
        </p>
      )}

      {peticion.datos && (
        <div className={peticion.cargando ? 'cargando-suave' : undefined}>
          {proyectos.length === 0 ? (
            <p className="vacio">Todav&iacute;a no hay proyectos registrados.</p>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Inicio</th>
                    <th scope="col">Incidencias</th>
                    {esAdministrador && <th scope="col">Acciones</th>}
                  </tr>
                </thead>

                <tbody>
                  {proyectos.map((proyecto) => (
                    <tr key={proyecto.id_proyecto}>
                      <td>
                        <span className="tabla__titulo">{proyecto.nombre}</span>
                        {proyecto.descripcion && (
                          <span className="tabla__descripcion">{proyecto.descripcion}</span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`estado-proyecto estado-proyecto--${proyecto.estado.toLowerCase()}`}
                        >
                          {etiquetaEstadoProyecto(proyecto.estado)}
                        </span>
                      </td>

                      <td className="tabla__fecha">
                        {proyecto.fecha_inicio ?? <span className="sin-dato">Sin fecha</span>}
                      </td>

                      {/* Las dos cifras juntas: el total dice cuanto se ha
                          trabajado y lo pendiente dice cuanto queda. Por
                          separado ninguna de las dos responde "como va". */}
                      <td className="tabla__categoria">
                        {proyecto.total_incidencias} en total,{' '}
                        <strong>{proyecto.incidencias_pendientes}</strong> sin cerrar
                      </td>

                      {esAdministrador && (
                        <td>
                          {confirmando === proyecto.id_proyecto ? (
                            <span className="confirmar-en-linea">
                              {/* Se avisa antes de intentarlo: el listado ya
                                  trae el conteo, asi que se sabe de antemano
                                  que el backend va a responder 409. */}
                              {proyecto.total_incidencias > 0 ? (
                                <>
                                  <span className="confirmar-en-linea__texto">
                                    Tiene {proyecto.total_incidencias} incidencias: no se puede
                                    eliminar.
                                  </span>
                                  <button
                                    className="enlace-boton"
                                    type="button"
                                    onClick={() => setConfirmando(null)}
                                  >
                                    Entendido
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="confirmar-en-linea__texto">
                                    &iquest;Eliminar?
                                  </span>
                                  <button
                                    className="enlace-boton"
                                    type="button"
                                    onClick={() => eliminar(proyecto.id_proyecto)}
                                    disabled={enviando}
                                  >
                                    S&iacute;
                                  </button>
                                  <button
                                    className="enlace-boton"
                                    type="button"
                                    onClick={() => setConfirmando(null)}
                                  >
                                    No
                                  </button>
                                </>
                              )}
                            </span>
                          ) : (
                            <span className="acciones-fila">
                              <button
                                className="enlace-boton"
                                type="button"
                                onClick={() => abrirEdicion(proyecto)}
                              >
                                Editar
                              </button>
                              <button
                                className="enlace-boton"
                                type="button"
                                onClick={() => setConfirmando(proyecto.id_proyecto)}
                              >
                                Eliminar
                              </button>
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {peticion.cargando && !peticion.datos && (
        <p className="estado estado--cargando">Cargando proyectos...</p>
      )}
    </main>
  );
}

