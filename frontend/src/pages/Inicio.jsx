/**
 * Pantalla de inicio.
 *
 * Responde dos preguntas al entrar: como esta el sistema y donde conviene
 * mirar. El indice de salud va primero porque es la unica cifra que resume el
 * estado de todo; la lista por proyecto va debajo, ordenada de peor a mejor,
 * porque un numero global no dice sobre que actuar.
 *
 * El desglose por componente (que parte del indice lo baja y con que evidencia)
 * no esta aqui a proposito: pide una pantalla propia, y meterlo en una tarjeta
 * del inicio obligaria a resumirlo hasta volverlo inutil.
 *
 * Se mantiene la tarjeta de conexion con el backend aunque no sea parte del
 * producto: durante el desarrollo el fallo mas frecuente es tener el servidor
 * apagado, y verlo aqui ahorra buscar el problema en otro lado.
 *
 * ---------------------------------------------------------------------------
 * DOS PETICIONES INDEPENDIENTES, NO UNA
 *
 * Cada tarjeta pide sus datos por su cuenta, con su propio estado de carga y
 * de error. Antes las dos iban en un Promise.all con un solo catch, y eso
 * acoplaba dos cosas que no tienen relacion: si fallaba el calculo del indice
 * tampoco se veia la tarjeta de conexion, que es justamente la que explica si
 * el backend esta caido. El error de cada una se muestra donde ocurrio, y se
 * puede reintentar sin recargar la pagina.
 */
import { Link } from 'react-router-dom';

import { obtenerEstadoApi } from '../api/health.js';
import { obtenerSalud } from '../api/metricas.js';
import { claseSalud, etiquetaSalud } from '../dominio/salud.js';
import { useSesion } from '../context/SesionContext.jsx';
import { usePeticion } from '../hooks/usePeticion.js';

export default function Inicio() {
  const { usuario, esAdministrador } = useSesion();

  // Las claves son constantes: ninguna de las dos peticiones depende de nada
  // que pueda cambiar mientras la pantalla esta abierta.
  const estadoApi = usePeticion(() => obtenerEstadoApi(), 'estado-api');
  const salud = usePeticion(() => obtenerSalud(), 'salud-global');

  return (
    <main className="contenedor contenido">
      <h1 className="titulo">Hola, {usuario.nombre.split(' ')[0]}</h1>
      <p className="subtitulo">
        Sesi&oacute;n iniciada como <strong>{usuario.rol}</strong> ({usuario.correo_electronico})
      </p>

      <section className="tarjeta">
        <h2>&Iacute;ndice de salud</h2>

        {salud.error && (
          <p className="alerta alerta--error">
            {salud.error.message}{' '}
            <button className="enlace-boton" type="button" onClick={salud.reintentar}>
              Reintentar
            </button>
          </p>
        )}

        {salud.cargando && !salud.datos && (
          <span className="estado estado--cargando">Calculando...</span>
        )}

        {salud.datos && (
          <>
            {/* datos_suficientes se mira ANTES del numero. Cuando es false el
                indice no significa nada, y mostrarlo igual seria fingir una
                medicion: el backend devuelve SIN_DATOS justamente para no
                tener que inventar un 100 que parece salud perfecta. */}
            {salud.datos.global.datos_suficientes ? (
              <p className="indice-grande">
                {salud.datos.global.indice}
                <span className={claseSalud(salud.datos.global.etiqueta)}>
                  {etiquetaSalud(salud.datos.global.etiqueta)}
                </span>
              </p>
            ) : (
              <p className="indice-grande">
                <span className={claseSalud('SIN_DATOS')}>
                  {etiquetaSalud('SIN_DATOS')}
                </span>
              </p>
            )}

            {salud.datos.global.datos_suficientes ? (
              <p className="ayuda ayuda--neutra">
                Combina tres componentes con pesos declarados: la antig&uuml;edad de lo que
                sigue abierto, la tasa de reapertura y la concentraci&oacute;n de incidencias
                por categor&iacute;a. Los pesos son una convenci&oacute;n del proyecto, no un
                resultado derivado de los datos.
              </p>
            ) : (
              <p className="ayuda ayuda--neutra">
                Todav&iacute;a no hay suficientes incidencias registradas para calcular un
                &iacute;ndice que signifique algo.
              </p>
            )}

            {/* El numero global no dice sobre que actuar; esta lista si. Viene
                del backend ya ordenada de peor a mejor, con los proyectos sin
                datos al final: no son urgentes, simplemente no hay nada que
                decir sobre ellos. Por eso no se reordena aqui. */}
            {salud.datos.proyectos.length > 0 && (
              <>
                <h3 className="subtitulo-seccion">Por proyecto, de peor a mejor</h3>
                <ul className="salud-proyectos">
                  {salud.datos.proyectos.map((proyecto) => (
                    <li className="salud-proyecto" key={proyecto.id_proyecto}>
                      <span className="salud-proyecto__nombre">{proyecto.nombre}</span>
                      <span className="salud-proyecto__indice">
                        {proyecto.datos_suficientes ? proyecto.indice : '-'}
                      </span>
                      <span className={claseSalud(proyecto.etiqueta)}>
                        {etiquetaSalud(proyecto.etiqueta)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="ayuda ayuda--neutra">
              <Link to="/salud">Ver el desglose por componente</Link>, con la evidencia que
              sostiene cada uno.
            </p>
          </>
        )}
      </section>

      <section className="tarjeta">
        <h2>Conexi&oacute;n con el backend</h2>

        {/* Esta es la tarjeta que importa cuando el servidor esta apagado: el
            cliente devuelve status 0 con el mensaje que dice como levantarlo. */}
        {estadoApi.error && (
          <p className="alerta alerta--aviso">
            {estadoApi.error.message}{' '}
            <button className="enlace-boton" type="button" onClick={estadoApi.reintentar}>
              Reintentar
            </button>
          </p>
        )}

        {estadoApi.cargando && !estadoApi.datos && (
          <span className="estado estado--cargando">Verificando...</span>
        )}

        {estadoApi.datos && (
          <>
            <span className="estado estado--ok">API conectada</span>
            <dl className="detalle">
              <dt>Servicio</dt>
              <dd>{estadoApi.datos.servicio}</dd>
              <dt>Entorno</dt>
              <dd>{estadoApi.datos.entorno}</dd>
              <dt>Registros</dt>
              <dd>
                {estadoApi.datos.baseDatos.registros.incidencias} incidencias,{' '}
                {estadoApi.datos.baseDatos.registros.proyectos} proyectos,{' '}
                {estadoApi.datos.baseDatos.registros.usuarios} usuarios
              </dd>
            </dl>
          </>
        )}
      </section>

      <section className="tarjeta">
        <h2>Pendiente</h2>
        <ul className="lista-simple">
          <li>Desglose del &iacute;ndice por componente, con la evidencia de cada uno</li>
          <li>Edici&oacute;n de una incidencia ya registrada</li>
          {esAdministrador && <li>Administraci&oacute;n de proyectos y usuarios</li>}
        </ul>
      </section>
    </main>
  );
}
