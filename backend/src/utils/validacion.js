/**
 * Utilidades de validacion compartidas por los services.
 *
 * Nacieron dentro de incidencia.service.js. Se trasladaron aqui cuando aparecio
 * el segundo caso de uso (proyecto.service.js) y quedo claro que la validacion
 * de un texto o de un identificador no tiene nada de particular de una entidad.
 * Extraerlas antes habria sido adivinar; hacerlo ahora es constatar un hecho.
 *
 * Todas comparten el mismo contrato:
 *   - Si el valor es valido, lo devuelven YA NORMALIZADO.
 *   - Si no lo es, agregan una entrada al arreglo `errores` y devuelven undefined.
 *
 * Acumular los problemas en un arreglo, en lugar de lanzar en el primero, es
 * deliberado: permite informar TODOS los errores de una sola vez. De lo
 * contrario el usuario corrige un campo, reenvia, y recien ahi se entera del
 * siguiente. El service llama a lanzarSiHayErrores() cuando termina de validar.
 *
 * Estas funciones no conocen entidades, ni tablas, ni Express. Solo tipos.
 */
import { errorSolicitud } from './errores.js';

/**
 * Indica si un campo "vino" en la peticion.
 *
 * Se consideran ausentes undefined, null y la cadena vacia. Esto permite
 * distinguir "no me mandaron el estado" de "me mandaron un estado vacio",
 * que son situaciones distintas al filtrar o al actualizar.
 */
export function vino(valor) {
  return valor !== undefined && valor !== null && valor !== '';
}

/**
 * Valida un texto y lo devuelve sin espacios sobrantes.
 *
 * El trim() no es cosmetico: sin el, un nombre de puros espacios ("   ")
 * pasaria como valido y quedaria guardado un registro sin nombre visible.
 *
 * @param {*}      valor
 * @param {string} campo   Nombre del campo, para el mensaje de error.
 * @param {object} largo   { min, max } en caracteres.
 * @param {Array}  errores Acumulador.
 */
export function validarTexto(valor, campo, largo, errores) {
  if (typeof valor !== 'string') {
    errores.push({ campo, mensaje: 'Debe ser un texto.' });
    return undefined;
  }

  const limpio = valor.trim();

  if (limpio.length < largo.min) {
    errores.push({ campo, mensaje: `Debe tener al menos ${largo.min} caracteres.` });
    return undefined;
  }

  if (limpio.length > largo.max) {
    errores.push({ campo, mensaje: `No puede superar los ${largo.max} caracteres.` });
    return undefined;
  }

  return limpio;
}

/**
 * Valida contra una lista cerrada de valores admitidos.
 * Acepta minusculas por comodidad: "activo" se normaliza a "ACTIVO".
 */
export function validarEnumerado(valor, permitidos, campo, errores) {
  if (typeof valor !== 'string') {
    errores.push({ campo, mensaje: `Debe ser uno de: ${permitidos.join(', ')}.` });
    return undefined;
  }

  const normalizado = valor.trim().toUpperCase();

  if (!permitidos.includes(normalizado)) {
    errores.push({
      campo,
      mensaje: `Debe ser uno de: ${permitidos.join(', ')}.`,
      recibido: valor,
    });
    return undefined;
  }

  return normalizado;
}

/**
 * Valida un identificador: entero positivo.
 *
 * Se usa Number() y no parseInt() porque parseInt('12abc') devuelve 12 sin
 * quejarse, y aqui interesa rechazar la basura y no adivinar la intencion.
 * Los identificadores llegan como texto cuando vienen de la URL y como numero
 * cuando vienen de un cuerpo JSON; Number() resuelve ambos casos.
 */
export function validarId(valor, campo, errores) {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    errores.push({ campo, mensaje: 'Debe ser un numero entero positivo.', recibido: valor });
    return undefined;
  }

  return numero;
}

/** Valida un entero dentro de un rango, con valor por defecto si no vino. */
export function validarEntero(valor, campo, { min, max, porDefecto }, errores) {
  if (!vino(valor)) return porDefecto;

  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero < min || numero > max) {
    errores.push({
      campo,
      mensaje: `Debe ser un numero entero entre ${min} y ${max}.`,
      recibido: valor,
    });
    return porDefecto;
  }

  return numero;
}

/**
 * Valida una fecha en formato ISO 'YYYY-MM-DD'.
 *
 * Se comprueban dos cosas distintas, y hacen falta las dos:
 *   1. Que el texto tenga la forma correcta (lo hace la expresion regular).
 *   2. Que la fecha exista de verdad. '2026-02-31' cumple el formato pero no
 *      es un dia real; JavaScript lo "corrige" silenciosamente al 3 de marzo.
 *      Por eso se reconstruye la fecha y se compara con lo recibido: si no
 *      coinciden, hubo un ajuste y el dato era invalido.
 *
 * Se usa este formato porque es el que guarda el esquema: en texto ISO las
 * fechas se ordenan y comparan correctamente de forma alfabetica, que es lo
 * que SQLite necesita al no tener un tipo DATE propio.
 */
export function validarFecha(valor, campo, errores) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    errores.push({
      campo,
      mensaje: 'Debe tener el formato AAAA-MM-DD, por ejemplo 2026-03-15.',
      recibido: valor,
    });
    return undefined;
  }

  const limpio = valor.trim();
  const fecha = new Date(`${limpio}T00:00:00Z`);

  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== limpio) {
    errores.push({ campo, mensaje: 'No corresponde a una fecha real.', recibido: valor });
    return undefined;
  }

  return limpio;
}

/**
 * Comprueba que un identificador apunte a un registro que existe.
 *
 * Convierte lo que seria un error de clave foranea de SQLite (respuesta 500,
 * "el servidor tiene un problema") en un 400 comprensible: el servidor esta
 * bien, el dato enviado es el que esta mal.
 *
 * @param {number}   id             Id ya validado, o undefined si fallo antes.
 * @param {Function} existeEnBase   Funcion del model correspondiente.
 * @param {string}   nombreEntidad  Como nombrarla en el mensaje ("el proyecto").
 */
export function validarReferencia(id, campo, existeEnBase, nombreEntidad, errores) {
  if (id === undefined) return undefined; // ya fallo antes; no se insiste

  if (!existeEnBase(id)) {
    errores.push({ campo, mensaje: `No existe ${nombreEntidad} con id ${id}.` });
    return undefined;
  }

  return id;
}

/** Si se acumulo al menos un problema, lanza un unico 400 con la lista completa. */
export function lanzarSiHayErrores(errores) {
  if (errores.length > 0) {
    throw errorSolicitud('Los datos enviados no son validos.', errores);
  }
}

/**
 * Valida un identificador que viene de la URL.
 *
 * A diferencia del resto, esta funcion lanza de inmediato en vez de acumular:
 * si el identificador no sirve, no tiene sentido seguir validando el cuerpo de
 * la peticion, porque no hay recurso sobre el cual aplicarlo.
 */
export function exigirIdValido(id) {
  const numero = Number(id);

  if (!Number.isInteger(numero) || numero <= 0) {
    throw errorSolicitud(`El identificador "${id}" no es valido: debe ser un entero positivo.`);
  }

  return numero;
}
