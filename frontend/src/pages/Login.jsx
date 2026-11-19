/**
 * Pantalla de inicio de sesion.
 *
 * Es la unica pantalla accesible sin sesion, asi que tambien es la primera que
 * ve alguien que abre la aplicacion por primera vez. Por eso incluye el aviso
 * de que hacer si el backend no responde: el fallo mas probable durante el
 * desarrollo es tener el servidor apagado, y sin esa pista el error queda como
 * un mensaje sin salida.
 */
import { useState } from 'react';

import { useSesion } from '../context/SesionContext.jsx';

export default function Login() {
  const { entrar } = useSesion();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [olvido, setOlvido] = useState(false);

  async function alEnviar(evento) {
    // Sin esto el navegador recarga la pagina al enviar el formulario, y se
    // pierde todo el estado de React.
    evento.preventDefault();

    setError(null);
    setEnviando(true);

    try {
      await entrar(correo, contrasena);
      // No hay nada mas que hacer: al quedar la sesion iniciada, App deja de
      // mostrar esta pantalla por si sola.
    } catch (fallo) {
      setError(fallo);
    } finally {
      // En el bloque finally para que el boton se reactive tanto si la
      // peticion funciono como si fallo. Si estuviera solo en el catch, un
      // error inesperado dejaria el formulario bloqueado para siempre.
      setEnviando(false);
    }
  }

  const sinConexion = error?.status === 0;

  return (
    <main className="pantalla-centrada">
      <form className="tarjeta tarjeta--login" onSubmit={alEnviar}>
        {/* El mismo logo del menu lateral: es lo primero que se ve, y lo que
            se vuelve a ver al entrar. */}
        <span className="login__logo" aria-hidden="true">
          SQ
        </span>
        <h1 className="titulo">Software Quality Hub</h1>
        <p className="subtitulo">Sistema de gesti&oacute;n de incidencias de software</p>

        <label className="campo">
          <span className="campo__etiqueta">Correo electr&oacute;nico</span>
          <input
            className="campo__control"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            // autoComplete le indica al navegador que puede ofrecer los datos
            // guardados, que es lo que la gente espera de un formulario de
            // acceso.
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Contrase&ntilde;a</span>
          <input
            className="campo__control"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className={`alerta ${sinConexion ? 'alerta--aviso' : 'alerta--error'}`}>
            {error.message}
            {sinConexion && (
              <>
                <br />
                Abre otra terminal, entra a la carpeta <code>backend</code> y ejecuta{' '}
                <code>npm run dev</code>.
              </>
            )}
          </p>
        )}

        <button className="boton boton--primario" type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        {/* La recuperacion la hace un administrador desde Usuarios (ver
            restablecerContrasena() en el backend), asi que aqui no hay
            formulario: solo se dice a quien acudir. Pedir el correo para
            "enviar instrucciones" prometeria un correo que nunca llega. */}
        <p className="ayuda ayuda--neutra">
          <button className="enlace-boton" type="button" onClick={() => setOlvido(!olvido)}>
            &iquest;Olvidaste tu contrase&ntilde;a?
          </button>
          {olvido && (
            <>
              <br />
              P&iacute;dele a un administrador del sistema que la restablezca. Te entregar&aacute;
              una contrase&ntilde;a temporal para entrar, y luego podr&aacute;s cambiarla por una
              tuya en la pantalla Usuarios.
            </>
          )}
        </p>
      </form>
    </main>
  );
}
