/**
 * Contexto de sesion.
 *
 * Un contexto de React es un valor que se pone a disposicion de todo un arbol
 * de componentes, para que cualquiera lo lea sin que haya que pasarlo de padre
 * a hijo en cada nivel. Sin el, el nombre del usuario conectado tendria que
 * viajar como propiedad desde App hasta el ultimo boton que lo necesite,
 * atravesando componentes a los que no les incumbe.
 *
 * Aqui se concentra todo lo relativo a "quien esta usando la aplicacion":
 *   - iniciar y cerrar sesion,
 *   - conservar la sesion entre recargas de la pagina,
 *   - comprobar al arrancar que el token guardado sigue sirviendo,
 *   - reaccionar cuando el backend responde que la sesion expiro.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, establecerToken, alExpirar, ErrorApi } from '../api/client.js';
import { iniciarSesion as iniciarSesionApi, obtenerSesion } from '../api/auth.js';

/**
 * Clave con la que se guarda la sesion en el navegador.
 *
 * Se usa localStorage y no memoria para que recargar la pagina no obligue a
 * entrar de nuevo. Tiene una contrapartida que conviene conocer: lo guardado
 * en localStorage es accesible desde JavaScript, de modo que un script
 * malicioso inyectado en la pagina podria leer el token.
 *
 * La alternativa mas segura seria una cookie HttpOnly, que el navegador envia
 * sola y JavaScript no puede leer; exige que el backend la emita y maneja
 * CSRF, lo que queda fuera del alcance de este proyecto. La mitigacion que si
 * se aplica es la vigencia corta del token (8 horas).
 */
const CLAVE_SESION = 'sqh.sesion';

const SesionContext = createContext(null);

/** Lee la sesion guardada. Devuelve null si no hay o si esta corrupta. */
function leerSesionGuardada() {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    // Si el contenido no es JSON valido (edicion manual, version antigua del
    // formato), se descarta en silencio: no hay sesion y punto.
    return null;
  }
}

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);

  // "comprobando" es un tercer estado, distinto de "conectado" y "sin
  // conectar". Al arrancar hay un momento en que todavia no se sabe si el
  // token guardado sirve. Sin este estado, la aplicacion mostraria el login
  // por un instante a alguien que si tiene sesion, con un parpadeo molesto.
  const [comprobando, setComprobando] = useState(true);

  /** Borra la sesion del navegador, del cliente HTTP y del estado. */
  const cerrarSesion = useCallback(() => {
    localStorage.removeItem(CLAVE_SESION);
    establecerToken(null);
    setUsuario(null);
  }, []);

  // Se le indica al cliente HTTP que, ante un 401, cierre la sesion. Asi la
  // aplicacion vuelve al login por si sola cuando el token expira, en lugar de
  // quedarse mostrando pantallas cuyas peticiones fallan todas.
  useEffect(() => {
    alExpirar(cerrarSesion);
  }, [cerrarSesion]);

  // Al arrancar: si hay un token guardado, se le pregunta al backend si sigue
  // valiendo. No basta con que exista en el navegador; pudo expirar o la
  // cuenta pudo eliminarse, y eso solo lo sabe el servidor.
  useEffect(() => {
    const guardada = leerSesionGuardada();

    if (!guardada?.token) {
      setComprobando(false);
      return;
    }

    establecerToken(guardada.token);

    obtenerSesion()
      // Se usa lo que responde el servidor, no lo que estaba guardado: el
      // nombre o el rol pudieron cambiar desde el ultimo inicio de sesion.
      .then((usuarioActual) => setUsuario(usuarioActual))
      .catch(() => cerrarSesion())
      .finally(() => setComprobando(false));
  }, [cerrarSesion]);

  /**
   * Inicia sesion y la deja disponible para toda la aplicacion.
   * @throws {ErrorApi} Lo que devuelva el backend; la pantalla de login decide
   *                    como mostrarlo.
   */
  const entrar = useCallback(async (correo, contrasena) => {
    const sesion = await iniciarSesionApi(correo, contrasena);

    localStorage.setItem(
      CLAVE_SESION,
      JSON.stringify({ token: sesion.token, usuario: sesion.usuario })
    );

    establecerToken(sesion.token);
    setUsuario(sesion.usuario);

    return sesion.usuario;
  }, []);

  /** Atajo para preguntar por el rol sin repetir la comparacion. */
  const esAdministrador = usuario?.rol === 'ADMINISTRADOR';

  // useMemo evita crear un objeto nuevo en cada render. Sin esto, React
  // consideraria que el valor del contexto cambio siempre, y volveria a
  // dibujar todos los componentes que lo consumen aunque nada haya cambiado.
  const valor = useMemo(
    () => ({ usuario, comprobando, entrar, cerrarSesion, esAdministrador }),
    [usuario, comprobando, entrar, cerrarSesion, esAdministrador]
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

/**
 * Acceso al contexto de sesion desde cualquier componente.
 *
 *     const { usuario, cerrarSesion } = useSesion();
 *
 * Lanza un error si se usa fuera del proveedor. Es deliberado: ese error
 * aparece de inmediato al desarrollar y dice exactamente que falta, mientras
 * que devolver null produciria fallos confusos mucho mas adelante.
 */
export function useSesion() {
  const contexto = useContext(SesionContext);

  if (contexto === null) {
    throw new Error('useSesion debe usarse dentro de <ProveedorSesion>.');
  }

  return contexto;
}

export { api, ErrorApi };
