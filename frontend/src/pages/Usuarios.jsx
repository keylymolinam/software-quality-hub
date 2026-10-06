/**
 * Usuarios: el equipo y su administracion.
 *
 * ---------------------------------------------------------------------------
 * TRES PERMISOS DISTINTOS EN UNA SOLA TABLA
 *
 * Esta pantalla es donde el control de acceso del sistema se ve completo,
 * porque cada accion tiene una regla diferente:
 *
 *   ver la lista        cualquier sesion
 *   crear y eliminar    solo un ADMINISTRADOR
 *   modificar           el propio usuario, o un ADMINISTRADOR
 *   cambiar el rol      solo un ADMINISTRADOR, aunque sea su propia cuenta
 *   cambiar la clave    SOLO el propio usuario, ni un administrador
 *
 * La ultima es la interesante: es la unica operacion del sistema que el rol de
 * administrador no alcanza, porque exige conocer la contrasena vigente. Un
 * administrador puede borrar una cuenta, pero no apropiarse de ella.
 *
 * El backend hace cumplir las cinco reglas. Aqui se reflejan para no ofrecer
 * botones que iban a responder 403, que es lo unico que la interfaz puede
 * aportar: esconder un boton no es seguridad.
 */
import { useState } from 'react';

import Campo from '../components/Campo.jsx';
import {
  actualizarUsuario,
  cambiarContrasena,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
} from '../api/usuarios.js';
import { ROLES, etiquetaRol } from '../dominio/usuarios.js';
import { formatearFechaHora } from '../dominio/incidencias.js';
import { useSesion } from '../context/SesionContext.jsx';
import { usePeticion } from '../hooks/usePeticion.js';

const LARGO_NOMBRE = { min: 3, max: 100 };
const LARGO_CONTRASENA = { min: 8, max: 72 };

const EN_BLANCO = { nombre: '', correo_electronico: '', contrasena: '', rol: 'DESARROLLADOR' };
const CLAVES_EN_BLANCO = { contrasena_actual: '', contrasena_nueva: '' };

export default function Usuarios() {
  const { usuario: sesion, esAdministrador } = useSesion();

  const [version, setVersion] = useState(0);

  // Un solo estado para los tres formularios, porque son excluyentes:
  // { modo: 'nuevo' | 'editar' | 'clave', id }. null = ninguno abierto.
  const [formulario, setFormulario] = useState(null);
  const [valores, setValores] = useState(EN_BLANCO);
  const [claves, setClaves] = useState(CLAVES_EN_BLANCO);

  const [confirmando, setConfirmando] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const peticion = usePeticion(() => listarUsuarios({ limite: 100 }), `usuarios-${version}`);

  function abrir(modo, usuario = null) {
    setError(null);
    setAviso(null);
    setFormulario({ modo, id: usuario?.id_usuario ?? null });

    if (modo === 'nuevo') setValores(EN_BLANCO);
    if (modo === 'editar') {
      setValores({
        nombre: usuario.nombre,
        correo_electronico: usuario.correo_electronico,
        contrasena: '',
        rol: usuario.rol,
      });
    }
    if (modo === 'clave') setClaves(CLAVES_EN_BLANCO);
  }

  function cerrar() {
    setFormulario(null);
    setValores(EN_BLANCO);
    setClaves(CLAVES_EN_BLANCO);
    setError(null);
  }

  async function guardar(evento) {
    evento.preventDefault();

    setError(null);
    setAviso(null);
    setEnviando(true);

    try {
      if (formulario.modo === 'nuevo') {
        await crearUsuario(valores);
      } else if (formulario.modo === 'editar') {
        // La contrasena no viaja por esta via: el backend la rechaza, y para
        // eso existe el formulario aparte. El rol solo se envia si quien edita
        // es administrador; de lo contrario seria un 403 anunciado.
        const cambios = {
          nombre: valores.nombre,
          correo_electronico: valores.correo_electronico,
        };

        if (esAdministrador) cambios.rol = valores.rol;

        await actualizarUsuario(formulario.id, cambios);
      } else {
        await cambiarContrasena(formulario.id, claves);
        setAviso('La contrase\u00f1a qued\u00f3 cambiada.');
      }

      cerrar();
      setVersion((n) => n + 1);
    } catch (fallo) {
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(idUsuario) {
    setError(null);
    setEnviando(true);

    try {
      await eliminarUsuario(idUsuario);
      setConfirmando(null);
      setVersion((n) => n + 1);
    } catch (fallo) {
      // El 409 llega cuando reporto incidencias o registro cambios de estado.
      // El mensaje del backend explica que eliminarlo destruiria esa
      // trazabilidad y sugiere la alternativa, asi que se muestra tal cual.
      setError(fallo);
      setConfirmando(null);
    } finally {
      setEnviando(false);
    }
  }

  const usuarios = peticion.datos?.datos ?? [];
  const puedeActuar = esAdministrador || usuarios.some((u) => u.id_usuario === sesion.id_usuario);

  return (
    <main className="contenedor contenedor--ancho contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Usuarios</h1>
          <p className="subtitulo">
            {esAdministrador
              ? 'El equipo con acceso al sistema y el rol de cada uno.'
              : 'El equipo con acceso al sistema. Puedes modificar tu propia cuenta.'}
          </p>
        </div>

        {esAdministrador && formulario === null && (
          <button
            className="boton boton--primario boton--auto"
            type="button"
            onClick={() => abrir('nuevo')}
          >
            Nuevo usuario
          </button>
        )}
      </header>

      {error && <p className="alerta alerta--error">{error.message}</p>}
      {aviso && <p className="alerta alerta--aviso">{aviso}</p>}

      {formulario?.modo === 'clave' ? (
        <form className="tarjeta" onSubmit={guardar}>
          <h2>Cambiar mi contrase&ntilde;a</h2>

          <Campo
            etiqueta="Contrase&ntilde;a actual"
            error={error?.mensajeDe('contrasena_actual')}
          >
            <input
              className="campo__control"
              type="password"
              value={claves.contrasena_actual}
              onChange={(e) => setClaves({ ...claves, contrasena_actual: e.target.value })}
              autoComplete="current-password"
              autoFocus
              required
            />
          </Campo>

          <Campo
            etiqueta="Contrase&ntilde;a nueva"
            ayuda={`Entre ${LARGO_CONTRASENA.min} y ${LARGO_CONTRASENA.max} caracteres`}
            error={error?.mensajeDe('contrasena_nueva')}
          >
            <input
              className="campo__control"
              type="password"
              value={claves.contrasena_nueva}
              onChange={(e) => setClaves({ ...claves, contrasena_nueva: e.target.value })}
              maxLength={LARGO_CONTRASENA.max}
              autoComplete="new-password"
              required
            />
          </Campo>

          <div className="acciones__confirmar">
            <button className="boton boton--primario boton--auto" type="submit" disabled={enviando}>
              {enviando ? 'Cambiando...' : 'Cambiar'}
            </button>
            <button
              className="boton boton--discreto boton--auto"
              type="button"
              onClick={cerrar}
              disabled={enviando}
            >
              Cancelar
            </button>
          </div>

          <p className="ayuda ayuda--neutra">
            Se pide la contrase&ntilde;a actual a prop&oacute;sito: as&iacute; una sesi&oacute;n
            que quede abierta no basta para apropiarse de la cuenta. Ni un administrador
            puede cambiar la clave de otra persona.
          </p>
        </form>
      ) : (
        formulario !== null && (
          <form className="tarjeta" onSubmit={guardar}>
            <h2>{formulario.modo === 'nuevo' ? 'Nuevo usuario' : 'Editar usuario'}</h2>

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
              etiqueta="Correo electr&oacute;nico"
              error={error?.mensajeDe('correo_electronico')}
            >
              <input
                className="campo__control"
                type="email"
                value={valores.correo_electronico}
                onChange={(e) => setValores({ ...valores, correo_electronico: e.target.value })}
                autoComplete="off"
                required
              />
            </Campo>

            {/* La contrasena solo al crear. Al editar no aparece, porque por
                esta via el backend la rechaza: cambiarla exige conocer la
                actual y tiene su propio formulario. */}
            {formulario.modo === 'nuevo' && (
              <Campo
                etiqueta="Contrase&ntilde;a"
                ayuda={`Entre ${LARGO_CONTRASENA.min} y ${LARGO_CONTRASENA.max} caracteres`}
                error={error?.mensajeDe('contrasena')}
              >
                <input
                  className="campo__control"
                  type="password"
                  value={valores.contrasena}
                  onChange={(e) => setValores({ ...valores, contrasena: e.target.value })}
                  maxLength={LARGO_CONTRASENA.max}
                  autoComplete="new-password"
                  required
                />
              </Campo>
            )}

            {/* El rol solo lo toca un administrador, tambien sobre su propia
                cuenta: si se ofreciera, alguien podria intentar ascenderse y
                recibir un 403 que no explica nada en un formulario. */}
            {esAdministrador && (
              <Campo etiqueta="Rol" error={error?.mensajeDe('rol')}>
                <select
                  className="campo__control"
                  value={valores.rol}
                  onChange={(e) => setValores({ ...valores, rol: e.target.value })}
                >
                  {ROLES.map((rol) => (
                    <option key={rol.valor} value={rol.valor}>
                      {rol.etiqueta}
                    </option>
                  ))}
                </select>
              </Campo>
            )}

            <div className="acciones__confirmar">
              <button
                className="boton boton--primario boton--auto"
                type="submit"
                disabled={enviando}
              >
                {enviando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                className="boton boton--discreto boton--auto"
                type="button"
                onClick={cerrar}
                disabled={enviando}
              >
                Cancelar
              </button>
            </div>
          </form>
        )
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
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Desde</th>
                  {puedeActuar && <th scope="col">Acciones</th>}
                </tr>
              </thead>

              <tbody>
                {usuarios.map((usuario) => {
                  const esUnoMismo = usuario.id_usuario === sesion.id_usuario;

                  return (
                    <tr key={usuario.id_usuario}>
                      <td>
                        <span className="tabla__titulo">{usuario.nombre}</span>
                        {esUnoMismo && <span className="marca marca--tu">t&uacute;</span>}
                      </td>

                      <td className="tabla__categoria">{usuario.correo_electronico}</td>

                      <td>
                        <span className="etiqueta-rol">{etiquetaRol(usuario.rol)}</span>
                      </td>

                      <td className="tabla__fecha">
                        {formatearFechaHora(usuario.fecha_creacion)}
                      </td>

                      {puedeActuar && (
                        <td>
                          {confirmando === usuario.id_usuario ? (
                            <span className="confirmar-en-linea">
                              <span className="confirmar-en-linea__texto">
                                &iquest;Eliminar la cuenta?
                              </span>
                              <button
                                className="enlace-boton"
                                type="button"
                                onClick={() => eliminar(usuario.id_usuario)}
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
                            </span>
                          ) : (
                            <span className="acciones-fila">
                              {(esAdministrador || esUnoMismo) && (
                                <button
                                  className="enlace-boton"
                                  type="button"
                                  onClick={() => abrir('editar', usuario)}
                                >
                                  Editar
                                </button>
                              )}

                              {/* La clave, solo la propia. Es la unica accion
                                  que un administrador no puede hacer por otro. */}
                              {esUnoMismo && (
                                <button
                                  className="enlace-boton"
                                  type="button"
                                  onClick={() => abrir('clave', usuario)}
                                >
                                  Contrase&ntilde;a
                                </button>
                              )}

                              {/* Eliminar la propia cuenta no se ofrece: la
                                  sesion quedaria apuntando a un usuario que ya
                                  no existe y la pantalla siguiente seria un
                                  error. El backend lo permitiria. */}
                              {esAdministrador && !esUnoMismo && (
                                <button
                                  className="enlace-boton"
                                  type="button"
                                  onClick={() => setConfirmando(usuario.id_usuario)}
                                >
                                  Eliminar
                                </button>
                              )}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {peticion.cargando && !peticion.datos && (
        <p className="estado estado--cargando">Cargando usuarios...</p>
      )}
    </main>
  );
}
