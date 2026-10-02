/**
 * Cliente HTTP centralizado.
 *
 * Todas las llamadas al backend pasan por aqui. Tener un unico punto de
 * entrada permite resolver en un solo lugar tres cosas que de otro modo habria
 * que repetir en cada pantalla:
 *
 *   1. Adjuntar el token de sesion a cada peticion.
 *   2. Convertir las respuestas de error en excepciones utiles.
 *   3. Detectar que la sesion expiro y avisar a quien corresponda.
 *
 * El token vive en una variable de este modulo y lo deposita el contexto de
 * sesion al iniciarla. La alternativa seria que cada componente lo recibiera y
 * lo pasara en cada llamada, y bastaria olvidarlo una vez para tener una
 * pantalla que falla con 401 sin motivo aparente.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** Token de la sesion actual. Lo escribe el contexto de sesion. */
let tokenActual = null;

/** Funcion a la que avisar cuando el backend responde 401. */
let alExpirarSesion = null;

/**
 * Error de la API con la informacion que hace falta para reaccionar.
 *
 * `status` permite distinguir un 401 (volver a entrar) de un 403 (no te
 * corresponde) o un 409 (ahora no se puede), que son situaciones distintas
 * para quien usa la aplicacion.
 *
 * `detalles` es la lista de problemas por campo que devuelve el backend en los
 * errores 400. Es lo que permite a un formulario marcar en rojo exactamente
 * los campos equivocados en vez de mostrar un mensaje generico.
 */
export class ErrorApi extends Error {
  constructor(mensaje, status, detalles = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
    this.detalles = detalles;
  }

  /** Devuelve el mensaje del campo indicado, si el backend lo reporto. */
  mensajeDe(campo) {
    return this.detalles?.find((d) => d.campo === campo)?.mensaje ?? null;
  }
}

/** Guarda el token que se enviara en las siguientes peticiones. */
export function establecerToken(token) {
  tokenActual = token;
}

/**
 * Registra que hacer cuando la sesion deja de ser valida.
 *
 * Lo usa el contexto de sesion para cerrar la sesion local cuando el backend
 * responde 401. Sin esto, la aplicacion seguiria mostrando al usuario como
 * conectado mientras cada peticion falla en silencio.
 */
export function alExpirar(callback) {
  alExpirarSesion = callback;
}

async function request(ruta, opciones = {}) {
  const cabeceras = { 'Content-Type': 'application/json', ...opciones.headers };

  if (tokenActual) {
    cabeceras.Authorization = `Bearer ${tokenActual}`;
  }

  let respuesta;

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers: cabeceras });
  } catch (error) {
    // fetch solo lanza cuando la peticion no llega a destino: servidor
    // apagado, sin red, CORS mal configurado. Conviene distinguirlo de un
    // error devuelto por el backend, porque la solucion es otra.
    throw new ErrorApi(
      'No se pudo conectar con el servidor. Revisa que el backend est\u00e9 ejecut\u00e1ndose.',
      0
    );
  }

  const datos = await respuesta.json().catch(() => null);

  // fetch NO lanza error con codigos 4xx/5xx: hay que revisarlo a mano.
  if (!respuesta.ok) {
    // La sesion dejo de valer. Se avisa antes de lanzar, para que la
    // aplicacion vuelva al login en lugar de mostrar el error en una pantalla
    // que el usuario ya no deberia estar viendo.
    //
    // Se excluye el propio login: un 401 alli significa "credenciales
    // incorrectas", no "tu sesion expiro", y cerrar una sesion que nunca se
    // abrio no tiene sentido.
    if (respuesta.status === 401 && ruta !== '/auth/login') {
      alExpirarSesion?.();
    }

    throw new ErrorApi(
      datos?.error || `Error ${respuesta.status} al llamar a ${ruta}`,
      respuesta.status,
      datos?.detalles ?? null
    );
  }

  return datos;
}

export const api = {
  get: (ruta) => request(ruta),
  post: (ruta, cuerpo) => request(ruta, { method: 'POST', body: JSON.stringify(cuerpo ?? {}) }),
  put: (ruta, cuerpo) => request(ruta, { method: 'PUT', body: JSON.stringify(cuerpo ?? {}) }),
  delete: (ruta) => request(ruta, { method: 'DELETE' }),
};

/**
 * Convierte un objeto de parametros en una cadena de consulta.
 *
 *     construirConsulta({ estado: 'ABIERTA', pagina: 2 })  ->  '?estado=ABIERTA&pagina=2'
 *     construirConsulta({ estado: '', pagina: 1 })         ->  '?pagina=1'
 *
 * Los valores vacios se descartan, y eso es justamente lo que hace falta: un
 * desplegable de filtro sin seleccionar vale cadena vacia, y enviar
 * `?estado=` no significa "sin filtro" para el backend, significa un estado
 * vacio. El backend lo trata como ausente (ver `vino()` en utils/validacion.js),
 * pero conviene no mandar basura y que la direccion de la pagina quede legible.
 *
 * URLSearchParams se encarga de escapar los valores, de modo que una busqueda
 * con espacios o con "&" no rompe la direccion.
 */
export function construirConsulta(parametros = {}) {
  const query = new URLSearchParams();

  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      query.set(clave, String(valor));
    }
  }

  const texto = query.toString();

  return texto ? `?${texto}` : '';
}
