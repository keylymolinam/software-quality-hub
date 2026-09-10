/**
 * Logica de inicio de sesion.
 *
 * Alcance deliberadamente acotado: iniciar sesion y verificar un token. No hay
 * recuperacion de contrasena, ni verificacion por correo, ni tokens de refresco,
 * ni bloqueo tras varios intentos fallidos. Para el alcance de este proyecto
 * basta con demostrar el mecanismo correctamente aplicado.
 *
 * Como funciona una sesion aqui:
 *
 *   1. La persona envia su correo y contrasena a POST /api/auth/login.
 *   2. Se compara la contrasena con el hash guardado (bcrypt).
 *   3. Si coincide, se emite un token JWT firmado con la clave del servidor.
 *   4. El frontend guarda ese token y lo envia en cada peticion siguiente,
 *      en la cabecera:  Authorization: Bearer <token>
 *
 * Un JWT no es secreto ni esta cifrado: cualquiera puede leer su contenido.
 * Lo que garantiza la firma es que NADIE PUEDE MODIFICARLO sin conocer la
 * clave del servidor. Por eso dentro del token solo va informacion que igual
 * seria visible para su dueno (id, nombre, rol), y jamas la contrasena.
 *
 * Ventaja de este esquema: el servidor no guarda sesiones, asi que no hay nada
 * que consultar en cada peticion. Desventaja: un token emitido no se puede
 * anular antes de que expire. Por eso la vigencia es corta (config.jwtExpiracion)
 * y "cerrar sesion" consiste en que el frontend olvide el token.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import * as Usuario from '../models/usuario.model.js';
import { config } from '../config/env.js';
import { ErrorHttp } from '../utils/errores.js';

/**
 * Hash de una contrasena que nadie usa, para igualar los tiempos de respuesta
 * cuando el correo no existe. Se calcula una sola vez al arrancar.
 */
const HASH_FICTICIO = bcrypt.hashSync('contrasena-que-no-corresponde-a-nadie', config.bcryptRondas);

/** 401 Unauthorized: no se pudo verificar quien hace la peticion. */
function errorNoAutenticado(mensaje) {
  return new ErrorHttp(mensaje, 401);
}

/**
 * Verifica las credenciales y emite un token de sesion.
 *
 * Sobre el mensaje de error: si el correo no existe y si la contrasena es
 * incorrecta se responde EXACTAMENTE lo mismo, "Correo o contrasena
 * incorrectos". Distinguir ambos casos le confirmaria a un atacante que una
 * direccion esta registrada, lo que le permite armar una lista de cuentas
 * validas antes de empezar a probar contrasenas.
 *
 * @throws {ErrorHttp} 400 si faltan datos, 401 si las credenciales no sirven.
 */
export function iniciarSesion(datos = {}) {
  const { correo_electronico: correo, contrasena } = datos;

  if (typeof correo !== 'string' || typeof contrasena !== 'string' || !correo || !contrasena) {
    throw new ErrorHttp('Debes indicar correo_electronico y contrasena.', 400);
  }

  // Se busca en minusculas porque asi se guardan los correos (ver
  // usuario.service.js). Sin esto, quien escribiera su correo con mayusculas
  // no podria entrar.
  const registro = Usuario.obtenerParaLogin(correo.trim().toLowerCase());

  // Si el correo no existe se compara igual contra un hash ficticio. Parece
  // trabajo inutil y no lo es: si se respondiera de inmediato, un atacante
  // notaria que las respuestas para correos inexistentes son mucho mas rapidas
  // que para los registrados, y eso basta para deducir que cuentas existen.
  // Este tipo de fuga se conoce como ataque de temporizacion.
  const hashGuardado = registro?.contrasena_hash ?? HASH_FICTICIO;
  const coincide = bcrypt.compareSync(contrasena, hashGuardado);

  if (!registro || !coincide) {
    throw errorNoAutenticado('Correo o contrasena incorrectos.');
  }

  // El hash se descarta aqui y no vuelve a aparecer.
  const { contrasena_hash: _descartado, ...usuario } = registro;

  return {
    token: emitirToken(usuario),
    expira_en: config.jwtExpiracion,
    usuario,
  };
}

/**
 * Firma un token con los datos publicos del usuario.
 *
 * `sub` (subject) es el nombre estandar del campo que identifica al titular del
 * token. Se incluyen tambien nombre y rol para que el frontend pueda mostrar
 * quien inicio sesion sin pedir el usuario de nuevo.
 *
 * El rol viaja dentro del token, pero eso NO significa que se pueda confiar en
 * el a ciegas para decidir permisos delicados: si a alguien se le cambia el rol,
 * su token seguira diciendo el anterior hasta que expire.
 */
export function emitirToken(usuario) {
  return jwt.sign(
    {
      sub: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo_electronico,
      rol: usuario.rol,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiracion }
  );
}

/**
 * Comprueba que un token sea autentico y no haya expirado.
 *
 * jwt.verify hace dos cosas: recalcula la firma con la clave del servidor y la
 * compara (si alguien cambio un solo caracter del token, no coincide), y revisa
 * la fecha de expiracion.
 *
 * @returns {object} El contenido del token.
 * @throws {ErrorHttp} 401 si es invalido o expiro.
 */
export function verificarToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    // Se distingue el token vencido del invalido porque son situaciones
    // distintas para quien usa la aplicacion: uno significa "vuelve a entrar",
    // el otro "algo esta mal con tu sesion".
    if (error.name === 'TokenExpiredError') {
      throw errorNoAutenticado('La sesion expiro. Vuelve a iniciar sesion.');
    }

    throw errorNoAutenticado('El token de sesion no es valido.');
  }
}

/**
 * Devuelve los datos actuales del usuario dueno del token.
 *
 * Se consulta la base en lugar de confiar en lo que dice el token, porque el
 * token es una foto del momento en que se emitio: el nombre o el rol pudieron
 * cambiar despues, e incluso la cuenta pudo eliminarse.
 *
 * @throws {ErrorHttp} 401 si el usuario del token ya no existe.
 */
export function obtenerSesion(idUsuario) {
  const usuario = Usuario.obtenerPorId(idUsuario);

  if (!usuario) {
    throw errorNoAutenticado('La cuenta asociada a esta sesion ya no existe.');
  }

  return usuario;
}
