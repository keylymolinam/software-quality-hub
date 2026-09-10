/**
 * Middleware de autenticacion.
 *
 * Se coloca delante de las rutas que exigen haber iniciado sesion:
 *
 *     router.post('/', requiereAutenticacion, crear);
 *
 * Su trabajo es leer el token de la cabecera Authorization, comprobarlo, y
 * dejar los datos de quien hace la peticion en `req.usuario`. A partir de ahi,
 * los controladores pueden saber QUIEN esta actuando sin que el cliente tenga
 * que declararlo en el cuerpo de la peticion.
 *
 * Esa distincion importa: hoy, para cambiar el estado de una incidencia, el
 * cliente envia `modificado_por` en el JSON. Es decir, cualquiera puede firmar
 * un cambio con el nombre de otra persona. Con la sesion disponible, ese dato
 * debe pasar a salir de `req.usuario.id` y no del cuerpo.
 *
 * Formato esperado de la cabecera (es el estandar, RFC 6750):
 *
 *     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
import { ErrorHttp } from '../utils/errores.js';
import { verificarToken, obtenerSesion } from '../services/auth.service.js';

/**
 * Extrae el token de la cabecera Authorization.
 * @returns {string|null} El token, o null si la cabecera falta o no tiene el formato.
 */
function leerToken(req) {
  const cabecera = req.get('authorization');
  if (!cabecera) return null;

  // Se separa en dos partes: el esquema ("Bearer") y el token.
  const [esquema, token] = cabecera.split(' ');

  if (!token || esquema.toLowerCase() !== 'bearer') return null;

  return token.trim();
}

/**
 * Exige una sesion valida. Si no la hay, corta con 401.
 *
 * 401 significa "no se quien eres" y es distinto de 403, que significa "se
 * quien eres, pero esto no te corresponde". Aqui siempre es 401: la peticion
 * ni siquiera llego a identificarse.
 */
export function requiereAutenticacion(req, res, next) {
  const token = leerToken(req);

  if (!token) {
    return next(
      new ErrorHttp(
        'Falta el token de sesion. Envia la cabecera: Authorization: Bearer <token>.',
        401
      )
    );
  }

  // verificarToken lanza un ErrorHttp 401 si el token es falso o expiro.
  const contenido = verificarToken(token);

  // Se consulta la base en vez de confiar solo en el token: la cuenta pudo
  // eliminarse o cambiar de rol despues de que el token fue emitido.
  const usuario = obtenerSesion(contenido.sub);

  req.usuario = usuario;

  return next();
}

/**
 * Exige que la sesion tenga alguno de los roles indicados.
 *
 *     router.delete('/:id', requiereAutenticacion, requiereRol('ADMINISTRADOR'), eliminar);
 *
 * Va SIEMPRE despues de requiereAutenticacion, que es quien llena req.usuario.
 *
 * Aqui si corresponde 403 y no 401: la persona esta correctamente
 * identificada, lo que ocurre es que su rol no alcanza para esta operacion.
 * Volver a iniciar sesion no cambiaria nada.
 */
export function requiereRol(...rolesPermitidos) {
  return function comprobarRol(req, res, next) {
    if (!req.usuario) {
      return next(new ErrorHttp('Esta ruta requiere iniciar sesion.', 401));
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(
        new ErrorHttp(
          `Esta operacion requiere uno de estos roles: ${rolesPermitidos.join(', ')}.`,
          403
        )
      );
    }

    return next();
  };
}

/**
 * Permite la operacion si quien la pide es el dueno del recurso, o si tiene
 * alguno de los roles indicados.
 *
 *     router.put('/:id', requiereAutenticacion, requiereSerElMismoO('ADMINISTRADOR'), actualizar);
 *
 * Hay permisos que no se pueden decidir mirando solo el rol: cualquiera puede
 * editar SU perfil, pero no el de otra persona. Eso depende de comparar quien
 * pide con sobre quien se pide, y por eso este middleware lee `req.params.id`.
 *
 * @param {...string} rolesQueTambienPueden Roles con permiso sobre cualquiera.
 */
export function requiereSerElMismoO(...rolesQueTambienPueden) {
  return function comprobarPropiedad(req, res, next) {
    if (!req.usuario) {
      return next(new ErrorHttp('Esta ruta requiere iniciar sesion.', 401));
    }

    const esElMismo = Number(req.params.id) === req.usuario.id_usuario;
    const tieneRol = rolesQueTambienPueden.includes(req.usuario.rol);

    if (!esElMismo && !tieneRol) {
      return next(
        new ErrorHttp('Solo puedes realizar esta operacion sobre tu propia cuenta.', 403)
      );
    }

    return next();
  };
}
