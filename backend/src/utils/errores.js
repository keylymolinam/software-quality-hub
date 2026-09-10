/**
 * Errores con codigo HTTP.
 *
 * Problema que resuelve: un service detecta que el titulo viene vacio, pero no
 * tiene acceso al objeto `res` de Express, y no deberia tenerlo. Si lo tuviera,
 * dejaria de ser logica de negocio para convertirse en codigo web, y no se
 * podria reutilizar desde una prueba o un script de linea de comandos.
 *
 * Solucion: el service LANZA un error que lleva el codigo HTTP adentro. El
 * middleware errorHandler, que si conoce Express, lee ese codigo y arma la
 * respuesta. Asi cada capa habla su propio idioma.
 *
 *     service:      throw errorSolicitud('El titulo es obligatorio');
 *     errorHandler: res.status(400).json({ error: 'El titulo es obligatorio' });
 *
 * Nota sobre `status`: se usa ese nombre y no otro porque errorHandler.js ya
 * lo esperaba (`err.status || err.statusCode || 500`).
 */

export class ErrorHttp extends Error {
  /**
   * @param {string} mensaje   Texto legible para quien consume la API.
   * @param {number} status    Codigo HTTP (400, 404, 409...).
   * @param {Array}  detalles  Lista opcional de problemas puntuales.
   */
  constructor(mensaje, status = 500, detalles = null) {
    super(mensaje);

    this.name = 'ErrorHttp';
    this.status = status;

    // Solo se agrega la propiedad si hay algo que informar, para no ensuciar
    // la respuesta JSON con un campo `detalles: null` en cada error.
    if (detalles) this.detalles = detalles;

    // Recorta el stack trace para que apunte a donde se lanzo el error y no
    // a este constructor, que no aporta informacion al depurar.
    Error.captureStackTrace?.(this, ErrorHttp);
  }
}

/**
 * 400 Bad Request: el cliente mando datos invalidos.
 *
 * `detalles` permite informar TODOS los problemas de una vez, en lugar de
 * obligar al usuario a corregir de a un campo por intento:
 *   [{ campo: 'titulo', mensaje: 'Es obligatorio' }, ...]
 */
export function errorSolicitud(mensaje, detalles = null) {
  return new ErrorHttp(mensaje, 400, detalles);
}

/**
 * 403 Forbidden: se sabe quien hace la peticion, pero no le corresponde.
 *
 * No confundir con 401, que significa "no se quien eres". La diferencia es
 * practica: ante un 401 el frontend manda a iniciar sesion; ante un 403 no
 * sirve de nada volver a entrar, porque el problema es el rol.
 */
export function errorProhibido(mensaje, detalles = null) {
  return new ErrorHttp(mensaje, 403, detalles);
}

/** 404 Not Found: el recurso pedido no existe. */
export function errorNoEncontrado(mensaje) {
  return new ErrorHttp(mensaje, 404);
}

/**
 * 409 Conflict: los datos son validos, pero chocan con el estado actual.
 *
 * Es el codigo que usara la maquina de estados para rechazar transiciones
 * imposibles: pedir CERRADA sobre una incidencia ABIERTA no es un error de
 * formato (400), es una operacion que no corresponde ahora mismo.
 */
export function errorConflicto(mensaje, detalles = null) {
  return new ErrorHttp(mensaje, 409, detalles);
}
