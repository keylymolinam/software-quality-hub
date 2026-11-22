/**
 * Service de COMENTARIO: la conversacion de cada incidencia.
 *
 * Dos reglas, las mismas que sostienen la bitacora:
 *   - El autor sale de la sesion (idUsuarioSesion), nunca del cuerpo de la
 *     peticion. Aceptarlo permitiria escribir en nombre de otra persona.
 *   - La fecha sale de SQLite (ahora()), no del reloj de Node, para que un
 *     comentario no quede antes que la incidencia que comenta.
 *
 * Cualquier sesion puede comentar: conversar sobre una incidencia es parte del
 * trabajo diario de todos los roles, igual que crearlas o cambiarles el estado.
 * No hay editar ni borrar (ver comentario.model.js).
 */
import * as Comentario from '../models/comentario.model.js';
import * as Incidencia from '../models/incidencia.model.js';
import { ahora } from '../db/database.js';
import { errorNoEncontrado } from '../utils/errores.js';
import { exigirIdValido, lanzarSiHayErrores, validarTexto } from '../utils/validacion.js';

/** Largo admitido. Dos mil caracteres alcanzan para pegar unos pasos o un error. */
const LARGO_TEXTO = { min: 1, max: 2000 };

/** Comprueba que la incidencia exista, para responder 404 y no una lista vacia. */
function exigirIncidencia(id) {
  const idIncidencia = exigirIdValido(id);
  if (!Incidencia.existe(idIncidencia)) {
    throw errorNoEncontrado(`No existe la incidencia con id ${idIncidencia}.`);
  }
  return idIncidencia;
}

/**
 * Los comentarios de una incidencia, del mas antiguo al mas reciente.
 * @throws {ErrorHttp} 404 si la incidencia no existe.
 */
export function listarComentarios(id) {
  return Comentario.listarPorIncidencia(exigirIncidencia(id));
}

/**
 * Agrega un comentario a una incidencia.
 *
 * @param {number|string} id               La incidencia.
 * @param {object}        datos            { texto } desde el cuerpo.
 * @param {number}        idUsuarioSesion  El autor, desde el token.
 * @throws {ErrorHttp} 404 si la incidencia no existe, 400 si el texto no sirve.
 */
export function agregarComentario(id, datos = {}, idUsuarioSesion) {
  const idIncidencia = exigirIncidencia(id);

  const errores = [];
  const texto = validarTexto(datos.texto, 'texto', LARGO_TEXTO, errores);
  lanzarSiHayErrores(errores);

  return Comentario.registrar({
    id_incidencia: idIncidencia,
    autor: idUsuarioSesion,
    texto,
    fecha_creacion: ahora(),
  });
}
