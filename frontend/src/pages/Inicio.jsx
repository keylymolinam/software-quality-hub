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
 * Debajo del indice va un mini tablero (ResumenInicio.jsx): las incidencias
 * por estado y las abiertas por prioridad. Responde "en que va el trabajo" sin
 * tapar al indice, que sigue siendo lo primero.
 *
 * ---------------------------------------------------------------------------
 * DISTRIBUCION
 *
 * Rejilla de dos columnas en un contenedor ancho, para que lo importante se
 * vea sin desplazarse (antes era una columna angosta y el mini tablero quedaba
 * bajo el pliegue). La lectura va de arriba a la izquierda hacia abajo:
 *   1. Indice de salud | proyectos de peor a mejor (cada uno con su barra).
 *   2. Incidencias por estado | abiertas por prioridad.
 *   3. Actividad reciente, a lo ancho: las ultimas 10 lineas de la bitacora.
 *   4. La conexion con el backend, en una franja de una linea: se conserva
 *      por decision de la autora, pero es informacion tecnica y no compite.
 * El boton "Nueva incidencia" va arriba porque es la accion mas frecuente. En
 * pantalla angosta todo pasa a una columna.
 *
 * Se mantiene la tarjeta de conexion con el backend aunque no sea parte del
 * producto: durante el desarrollo el fallo mas frecuente es tener el servidor
 * apagado, y verlo aqui ahorra buscar el problema en otro lado.
 *
 * ---------------------------------------------------------------------------
 * PETICIONES INDEPENDIENTES, NO UNA
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
import { listarIncidencias, obtenerActividad } from '../api/incidencias.js';
import ActividadReciente from '../components/ActividadReciente.jsx';
import { obtenerSalud } from '../api/metricas.js';
import { AnilloEstados, BarrasPrioridad } from '../components/ResumenInicio.jsx';
import { PRIORIDADES } from '../dominio/incidencias.js';
import { claseSalud, etiquetaSalud } from '../dominio/salud.js';
import { useSesion } from '../context/SesionContext.jsx';
import { usePeticion } from '../hooks/usePeticion.js';

/** Lo abierto es todo lo que no esta cerrado: tambien lo resuelto y validado. */
const contarAbiertas = (porEstado) =>
  Object.entries(porEstado).reduce((suma, [estado, n]) => (estado === 'CERRADA' ? suma : suma + n), 0);

/**
 * Los numeros del mini tablero, sin tocar el backend: el listado ya devuelve
 * la cuenta por estado (resumen_estados) con los filtros puestos. Una peticion
 * sin filtros da los estados; una por prioridad da cuantas siguen abiertas en
 * cada una. limite: 1 porque solo interesan las cuentas, no las filas.
 */
function pedirResumen() {
  return Promise.all([
    listarIncidencias({ limite: 1 }),
    ...PRIORIDADES.map(({ valor }) => listarIncidencias({ prioridad: valor, limite: 1 })),
  ]).then(([todas, ...porPrioridad]) => ({
    porEstado: todas.resumen_estados,
    abiertasPorPrioridad: Object.fromEntries(
      PRIORIDADES.map(({ valor }, i) => [valor, contarAbiertas(porPrioridad[i].resumen_estados)])
    ),
  }));
}

export default function Inicio() {
  const { usuario } = useSesion();

  // Las claves son constantes: ninguna de las peticiones depende de nada
  // que pueda cambiar mientras la pantalla esta abierta.
  const estadoApi = usePeticion(() => obtenerEstadoApi(), 'estado-api');
  const salud = usePeticion(() => obtenerSalud(), 'salud-global');
  const resumen = usePeticion(pedirResumen, 'resumen-inicio');
  // Diez lineas: alcanzan para ver que se movio hoy sin convertir el inicio
  // en la bitacora entera, que ya esta en el detalle de cada incidencia.
  const actividad = usePeticion(() => obtenerActividad(10), 'actividad-inicio');

  // El error de cada peticion se muestra una sola vez, en la primera tarjeta
  // que la usa; la otra dice que no tiene datos, sin repetir el aviso.
  const errorCon = (peticion) => (
    <p className="alerta alerta--error">
      {peticion.error.message}{' '}
      <button className="enlace-boton" type="button" onClick={peticion.reintentar}>
        Reintentar
      </button>
    </p>
  );

  return (
    <main className="contenedor contenedor--ancho contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Hola, {usuario.nombre.split(' ')[0]}</h1>
          <p className="subtitulo">
            Sesi&oacute;n iniciada como <strong>{usuario.rol}</strong> ({usuario.correo_electronico})
          </p>
        </div>
        <Link className="boton boton--primario boton--auto" to="/incidencias/nueva">
          Nueva incidencia
        </Link>
      </header>

      <div className="inicio-rejilla">
        <section className="tarjeta">
          <h2>&Iacute;ndice de salud</h2>

          {salud.error && errorCon(salud)}

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
                  <span className={claseSalud('SIN_DATOS')}>{etiquetaSalud('SIN_DATOS')}</span>
                </p>
              )}

              {/* Una linea, no el parrafo de antes: la explicacion completa
                  esta en la guia, a un clic. */}
              <p className="inicio__explicacion">
                {salud.datos.global.datos_suficientes ? (
                  <>
                    Resume en un n&uacute;mero de 0 a 100 la antig&uuml;edad de lo abierto, la
                    reapertura y la concentraci&oacute;n por categor&iacute;a.
                  </>
                ) : (
                  <>
                    Todav&iacute;a no hay suficientes incidencias registradas para calcular un
                    &iacute;ndice que signifique algo.
                  </>
                )}
              </p>

              <p className="inicio__enlaces">
                <Link to="/salud">Ver el desglose</Link>
                <Link to="/salud/guia">&iquest;C&oacute;mo se calcula?</Link>
              </p>
            </>
          )}
        </section>

        <section className="tarjeta">
          <h2>Proyectos, de peor a mejor</h2>

          {salud.cargando && !salud.datos && (
            <span className="estado estado--cargando">Calculando...</span>
          )}
          {salud.error && <p className="vacio">Sin datos para mostrar.</p>}

          {/* El numero global no dice sobre que actuar; esta lista si. Viene
              del backend ya ordenada de peor a mejor, con los proyectos sin
              datos al final, y por eso no se reordena aqui. La barra mide el
              indice (0 a 100) para ver de un vistazo cual esta peor; la
              etiqueta de color dice la franja, y el numero, el valor exacto. */}
          {salud.datos &&
            (salud.datos.proyectos.length === 0 ? (
              <p className="vacio">Todav&iacute;a no hay proyectos.</p>
            ) : (
              <ul className="salud-proyectos">
                {salud.datos.proyectos.map((proyecto) => (
                  <li className="salud-proyecto" key={proyecto.id_proyecto}>
                    <span className="salud-proyecto__nombre">{proyecto.nombre}</span>
                    <div
                      className="barra barra--delgada"
                      role="img"
                      aria-label={`${proyecto.nombre}: ${
                        proyecto.datos_suficientes ? proyecto.indice : 'sin datos'
                      }`}
                    >
                      {proyecto.datos_suficientes && (
                        <div className="barra__relleno" style={{ width: `${proyecto.indice}%` }} />
                      )}
                    </div>
                    <span className="salud-proyecto__indice">
                      {proyecto.datos_suficientes ? proyecto.indice : '-'}
                    </span>
                    <span className={claseSalud(proyecto.etiqueta)}>
                      {etiquetaSalud(proyecto.etiqueta)}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
        </section>

        <section className="tarjeta">
          <h2>Incidencias por estado</h2>

          {resumen.error && errorCon(resumen)}
          {resumen.cargando && !resumen.datos && (
            <span className="estado estado--cargando">Cargando...</span>
          )}

          {resumen.datos && (
            <>
              <AnilloEstados porEstado={resumen.datos.porEstado} />
              <p className="inicio__enlaces">
                <Link to="/tablero">Ver el tablero</Link>
              </p>
            </>
          )}
        </section>

        <section className="tarjeta">
          <h2>Abiertas por prioridad</h2>

          {resumen.error && <p className="vacio">Sin datos para mostrar.</p>}
          {resumen.cargando && !resumen.datos && (
            <span className="estado estado--cargando">Cargando...</span>
          )}

          {resumen.datos && (
            <>
              <BarrasPrioridad abiertasPorPrioridad={resumen.datos.abiertasPorPrioridad} />
              <p className="inicio__enlaces">
                <Link to="/incidencias?prioridad=ALTA">Ver las de prioridad alta</Link>
              </p>
            </>
          )}
        </section>

        <section className="tarjeta inicio__ancha">
          <h2>Actividad reciente</h2>

          {actividad.error && errorCon(actividad)}
          {actividad.cargando && !actividad.datos && (
            <span className="estado estado--cargando">Cargando...</span>
          )}
          {actividad.datos && <ActividadReciente movimientos={actividad.datos.movimientos} />}
        </section>
      </div>

      {/* Informacion tecnica, en una franja: importa cuando el servidor esta
          apagado (el cliente devuelve status 0 con el mensaje que dice como
          levantarlo), y el resto del tiempo no tiene por que ocupar espacio. */}
      <section className="tarjeta conexion">
        <h2>Conexi&oacute;n con el backend</h2>

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
            <span className="conexion__dato">
              <span className="conexion__rotulo">Servicio</span> {estadoApi.datos.servicio}
            </span>
            <span className="conexion__dato">
              <span className="conexion__rotulo">Entorno</span> {estadoApi.datos.entorno}
            </span>
            <span className="conexion__dato">
              <span className="conexion__rotulo">Registros</span>{' '}
              {estadoApi.datos.baseDatos.registros.incidencias} incidencias,{' '}
              {estadoApi.datos.baseDatos.registros.proyectos} proyectos,{' '}
              {estadoApi.datos.baseDatos.registros.usuarios} usuarios
            </span>
          </>
        )}
      </section>
    </main>
  );
}
