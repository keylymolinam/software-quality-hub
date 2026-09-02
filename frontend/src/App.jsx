/**
 * Componente raiz de la aplicacion.
 *
 * Por ahora solo verifica la conexion con el backend. En las semanas 3-5
 * este archivo pasara a contener el enrutador con las pantallas reales
 * (login, incidencias, dashboard).
 */
import { useEffect, useState } from 'react';
import { obtenerEstadoApi } from './api/health.js';

export default function App() {
  // "estado" guarda en que situacion esta la consulta al backend.
  const [estado, setEstado] = useState('cargando'); // cargando | ok | error
  const [datos, setDatos] = useState(null);
  const [mensajeError, setMensajeError] = useState('');

  // useEffect ejecuta este codigo una sola vez, cuando el componente aparece
  // en pantalla. El array vacio [] del final es lo que significa "solo una vez".
  useEffect(() => {
    obtenerEstadoApi()
      .then((respuesta) => {
        setDatos(respuesta);
        setEstado('ok');
      })
      .catch((error) => {
        setMensajeError(error.message);
        setEstado('error');
      });
  }, []);

  return (
    <main className="contenedor">
      <h1 className="titulo">Software Quality Hub</h1>
      <p className="subtitulo">Sistema de gestion de incidencias de software</p>

      <section className="tarjeta">
        <h2>Conexion con el backend</h2>

        {estado === 'cargando' && (
          <span className="estado estado--cargando">Verificando...</span>
        )}

        {estado === 'ok' && (
          <>
            <span className="estado estado--ok">API conectada</span>
            <dl className="detalle">
              <dt>Servicio</dt>
              <dd>{datos.servicio}</dd>
              <dt>Version</dt>
              <dd>{datos.version}</dd>
              <dt>Entorno</dt>
              <dd>{datos.entorno}</dd>
              <dt>Respuesta</dt>
              <dd>{new Date(datos.marcaTiempo).toLocaleString('es-CL')}</dd>
            </dl>
          </>
        )}

        {estado === 'error' && (
          <>
            <span className="estado estado--error">Sin conexion</span>
            <p className="ayuda">
              <strong>{mensajeError}</strong>
              <br />
              Revisa que el backend este ejecutandose: abre otra terminal, entra
              a la carpeta <code>backend</code> y ejecuta <code>npm run dev</code>.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
