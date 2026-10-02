/**
 * Pantalla de inicio, provisional.
 *
 * Existe para comprobar que la sesion funciona de punta a punta: los datos que
 * muestra vienen de peticiones autenticadas al backend, de modo que si esta
 * pantalla se dibuja es porque el token viaja correctamente en cada llamada.
 *
 * La reemplazara el dashboard del indice de salud.
 */
import { useEffect, useState } from 'react';

import { api } from '../api/client.js';
import { obtenerEstadoApi } from '../api/health.js';
import { useSesion } from '../context/SesionContext.jsx';

export default function Inicio() {
  const { usuario, esAdministrador } = useSesion();

  const [estadoApi, setEstadoApi] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Promise.all lanza las dos peticiones a la vez en lugar de una despues de
    // otra: son independientes y no tiene sentido que la segunda espere.
    Promise.all([
      obtenerEstadoApi(),
      api.get('/metricas/salud'),
    ])
      .then(([estado, salud]) => {
        setEstadoApi(estado);
        setResumen(salud);
      })
      .catch(setError);
  }, []);

  return (
    <main className="contenedor contenido">
      <h1 className="titulo">Hola, {usuario.nombre.split(' ')[0]}</h1>
      <p className="subtitulo">
        Sesi&oacute;n iniciada como <strong>{usuario.rol}</strong> ({usuario.correo_electronico})
      </p>

      {error && <p className="alerta alerta--error">{error.message}</p>}

      <section className="tarjeta">
        <h2>Conexi&oacute;n con el backend</h2>
        {estadoApi ? (
          <>
            <span className="estado estado--ok">API conectada</span>
            <dl className="detalle">
              <dt>Servicio</dt>
              <dd>{estadoApi.servicio}</dd>
              <dt>Entorno</dt>
              <dd>{estadoApi.entorno}</dd>
              <dt>Registros</dt>
              <dd>
                {estadoApi.baseDatos.registros.incidencias} incidencias,{' '}
                {estadoApi.baseDatos.registros.proyectos} proyectos,{' '}
                {estadoApi.baseDatos.registros.usuarios} usuarios
              </dd>
            </dl>
          </>
        ) : (
          <span className="estado estado--cargando">Verificando...</span>
        )}
      </section>

      {resumen && (
        <section className="tarjeta">
          <h2>&Iacute;ndice de salud (adelanto)</h2>
          <p className="indice-grande">
            {resumen.global.indice}
            <span className={`etiqueta-salud etiqueta-salud--${resumen.global.etiqueta.toLowerCase()}`}>
              {resumen.global.etiqueta}
            </span>
          </p>
          <p className="ayuda ayuda--neutra">
            Esta petici&oacute;n requiere sesi&oacute;n iniciada. Que se vea significa que el token
            viaja correctamente en la cabecera <code>Authorization</code>.
          </p>
        </section>
      )}

      <section className="tarjeta">
        <h2>Pr&oacute;ximas pantallas</h2>
        <ul className="lista-simple">
          <li>Detalle, transiciones de estado y bit&aacute;cora</li>
          <li>Formulario de registro con clasificaci&oacute;n sugerida y aviso de duplicados</li>
          <li>Dashboard del &iacute;ndice de salud</li>
          {esAdministrador && <li>Administraci&oacute;n de proyectos y usuarios</li>}
        </ul>
      </section>
    </main>
  );
}
