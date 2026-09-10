/**
 * Logica de negocio de USUARIO.
 *
 * Mismo patron que las otras entidades, con dos asuntos propios:
 *
 *   1. La contrasena nunca se guarda tal como se escribio, sino su hash.
 *   2. El correo electronico es unico, y esa unicidad hay que explicarla
 *      cuando se incumple.
 *
 * Este archivo se ocupa de administrar usuarios (crear, editar, eliminar).
 * Iniciar sesion es otra cosa y vive en auth.service.js.
 */
import bcrypt from 'bcryptjs';

import * as Usuario from '../models/usuario.model.js';
import { config } from '../config/env.js';
import {
  errorNoEncontrado,
  errorConflicto,
  errorSolicitud,
  errorProhibido,
} from '../utils/errores.js';
import {
  vino,
  validarTexto,
  validarEnumerado,
  validarEntero,
  lanzarSiHayErrores,
  exigirIdValido,
} from '../utils/validacion.js';

// ---------------------------------------------------------------------------
// Valores admitidos
// ---------------------------------------------------------------------------

/** Refleja el CHECK de schema.sql. */
export const ROLES = ['ADMINISTRADOR', 'DESARROLLADOR', 'TESTER', 'ANALISTA'];

const LARGO_NOMBRE = { min: 3, max: 100 };
const LARGO_CORREO = { min: 5, max: 150 };

/**
 * Largo minimo de la contrasena.
 *
 * Ocho caracteres es el minimo razonable y es lo que se exige aqui. No se
 * imponen reglas de composicion (una mayuscula, un numero, un simbolo) porque
 * en la practica empujan a la gente hacia contrasenas cortas y predecibles del
 * tipo "Password1!", mientras que el largo es lo que realmente encarece un
 * ataque por fuerza bruta.
 */
const LARGO_CONTRASENA = { min: 8, max: 72 };

// El maximo de 72 no es arbitrario: bcrypt ignora todo lo que exceda los 72
// bytes. Si se aceptaran contrasenas mas largas, dos claves distintas que
// compartan los primeros 72 bytes serian equivalentes al iniciar sesion, y
// nadie entenderia por que.

const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 100;

const CAMPOS_EDITABLES = ['nombre', 'correo_electronico', 'rol', 'contrasena'];

// ---------------------------------------------------------------------------
// Utilidades propias
// ---------------------------------------------------------------------------

/**
 * Valida un correo electronico y lo normaliza a minusculas.
 *
 * La expresion regular es deliberadamente simple: exige algo, una arroba, algo,
 * un punto y algo. Validar direcciones de correo de forma exhaustiva con una
 * expresion regular es un problema conocido por no tener buena solucion (la
 * norma admite formas que nadie usa), y el unico examen que de verdad prueba
 * que un correo existe es enviarle un mensaje.
 *
 * Se guarda en minusculas para que "Ana@Empresa.cl" y "ana@empresa.cl" no
 * puedan registrarse como dos cuentas distintas: el UNIQUE de SQLite distingue
 * mayusculas y no las trataria como iguales.
 */
function validarCorreo(valor, errores) {
  const texto = validarTexto(valor, 'correo_electronico', LARGO_CORREO, errores);
  if (texto === undefined) return undefined;

  const normalizado = texto.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)) {
    errores.push({
      campo: 'correo_electronico',
      mensaje: 'No parece una direccion de correo valida.',
      recibido: valor,
    });
    return undefined;
  }

  return normalizado;
}

/**
 * Valida la contrasena en claro. Devuelve el texto tal cual, sin recortar.
 *
 * No se aplica trim(): los espacios al principio o al final son caracteres
 * legitimos de una contrasena, y recortarlos silenciosamente haria que la
 * persona no pudiera volver a entrar con lo que escribio.
 */
function validarContrasena(valor, campo, errores) {
  if (typeof valor !== 'string') {
    errores.push({ campo, mensaje: 'Debe ser un texto.' });
    return undefined;
  }

  if (valor.length < LARGO_CONTRASENA.min) {
    errores.push({
      campo,
      mensaje: `Debe tener al menos ${LARGO_CONTRASENA.min} caracteres.`,
    });
    return undefined;
  }

  if (valor.length > LARGO_CONTRASENA.max) {
    errores.push({
      campo,
      mensaje: `No puede superar los ${LARGO_CONTRASENA.max} caracteres (limite de bcrypt).`,
    });
    return undefined;
  }

  return valor;
}

/**
 * Convierte una contrasena en su hash.
 *
 * bcrypt genera internamente una "sal" distinta para cada llamada y la incluye
 * dentro del hash resultante. Por eso la misma contrasena produce hashes
 * distintos cada vez, y por eso no se puede buscar en la base "quien tiene esta
 * contrasena": no hay dos iguales aunque coincidan.
 *
 * Es intencionadamente lento (ver config.bcryptRondas). Esa lentitud es la
 * defensa: hace inviable probar millones de combinaciones por segundo.
 */
export function calcularHash(contrasenaEnClaro) {
  return bcrypt.hashSync(contrasenaEnClaro, config.bcryptRondas);
}

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------

/**
 * Lista usuarios con filtros y paginacion.
 * Nunca incluye el hash de la contrasena: el model no lo devuelve.
 */
export function listarUsuarios(consulta = {}) {
  const errores = [];
  const filtros = {};

  if (vino(consulta.rol)) {
    filtros.rol = validarEnumerado(consulta.rol, ROLES, 'rol', errores);
  }
  if (vino(consulta.busqueda)) {
    filtros.busqueda = String(consulta.busqueda).trim();
  }

  const limite = validarEntero(
    consulta.limite,
    'limite',
    { min: 1, max: LIMITE_MAXIMO, porDefecto: LIMITE_POR_DEFECTO },
    errores
  );

  const pagina = validarEntero(
    consulta.pagina,
    'pagina',
    { min: 1, max: Number.MAX_SAFE_INTEGER, porDefecto: 1 },
    errores
  );

  lanzarSiHayErrores(errores);

  filtros.limite = limite;
  filtros.desplazamiento = (pagina - 1) * limite;
  filtros.ordenarPor = consulta.ordenarPor;
  filtros.direccion = consulta.direccion;

  const datos = Usuario.listar(filtros);
  const total = Usuario.contar(filtros);

  return {
    datos,
    paginacion: {
      total,
      pagina,
      limite,
      paginas: Math.max(1, Math.ceil(total / limite)),
    },
  };
}

/**
 * Devuelve un usuario por su id.
 * @throws {ErrorHttp} 404 si no existe.
 */
export function obtenerUsuario(id) {
  const idUsuario = exigirIdValido(id);
  const usuario = Usuario.obtenerPorId(idUsuario);

  if (!usuario) {
    throw errorNoEncontrado(`No existe el usuario con id ${idUsuario}.`);
  }

  return usuario;
}

/**
 * Crea un usuario.
 *
 * Obligatorios: nombre, correo_electronico, contrasena, rol.
 * La respuesta nunca incluye la contrasena ni su hash.
 *
 * @throws {ErrorHttp} 400 si los datos son invalidos, 409 si el correo ya existe.
 */
export function crearUsuario(datos = {}) {
  const errores = [];

  const nombre = validarTexto(datos.nombre, 'nombre', LARGO_NOMBRE, errores);
  const correo = validarCorreo(datos.correo_electronico, errores);
  const contrasena = validarContrasena(datos.contrasena, 'contrasena', errores);
  const rol = vino(datos.rol)
    ? validarEnumerado(datos.rol, ROLES, 'rol', errores)
    : (errores.push({ campo: 'rol', mensaje: 'Es obligatorio.' }), undefined);

  lanzarSiHayErrores(errores);

  // Se comprueba despues de validar el formato: no tiene sentido consultar la
  // base con un correo que ni siquiera es una direccion valida.
  //
  // Se responde 409 y no 400 porque el dato esta bien formado; lo que ocurre
  // es que choca con algo que ya existe en el sistema.
  if (Usuario.obtenerPorCorreo(correo)) {
    throw errorConflicto(`Ya existe un usuario registrado con el correo ${correo}.`, [
      { campo: 'correo_electronico', mensaje: 'Este correo ya esta en uso.' },
    ]);
  }

  return Usuario.crear({
    nombre,
    correo_electronico: correo,
    contrasena_hash: calcularHash(contrasena),
    rol,
  });
}

/**
 * Actualiza parcialmente un usuario.
 *
 * La contrasena NO se cambia por esta via: para eso existe cambiarContrasena(),
 * que exige conocer la actual. Si se pudiera cambiar con un PUT corriente,
 * cualquiera con acceso momentaneo a una sesion abierta podria dejar a su dueno
 * fuera de su propia cuenta.
 *
 * El rol solo lo puede cambiar un ADMINISTRADOR. Sin esa comprobacion,
 * cualquiera podria ascenderse a si mismo editando su propio perfil, que es
 * una operacion que el middleware requiereSerElMismoO() permite.
 *
 * @param {object} sesion Usuario que realiza la operacion (req.usuario).
 * @throws {ErrorHttp} 404 si no existe, 400 datos invalidos, 403 si cambia el
 *                     rol sin ser administrador, 409 correo repetido.
 */
export function actualizarUsuario(id, cambios = {}, sesion = {}) {
  const idUsuario = exigirIdValido(id);

  if (!Usuario.existe(idUsuario)) {
    throw errorNoEncontrado(`No existe el usuario con id ${idUsuario}.`);
  }

  if (Object.hasOwn(cambios, 'rol') && sesion.rol !== 'ADMINISTRADOR') {
    throw errorProhibido('Solo un ADMINISTRADOR puede cambiar el rol de un usuario.');
  }

  const errores = [];
  const aplicar = {};

  if (Object.hasOwn(cambios, 'contrasena') || Object.hasOwn(cambios, 'contrasena_hash')) {
    errores.push({
      campo: 'contrasena',
      mensaje:
        'La contrasena no se cambia por esta via. Usa PUT /api/usuarios/:id/contrasena, que exige la contrasena actual.',
    });
  }

  if (Object.hasOwn(cambios, 'nombre')) {
    aplicar.nombre = validarTexto(cambios.nombre, 'nombre', LARGO_NOMBRE, errores);
  }

  if (Object.hasOwn(cambios, 'rol')) {
    aplicar.rol = validarEnumerado(cambios.rol, ROLES, 'rol', errores);
  }

  if (Object.hasOwn(cambios, 'correo_electronico')) {
    const correo = validarCorreo(cambios.correo_electronico, errores);

    if (correo !== undefined) {
      const duenoActual = Usuario.obtenerPorCorreo(correo);

      // Que el correo ya exista solo es un problema si pertenece a OTRA
      // persona. Reenviar el propio correo sin cambios debe ser inofensivo.
      if (duenoActual && duenoActual.id_usuario !== idUsuario) {
        throw errorConflicto(`Ya existe otro usuario registrado con el correo ${correo}.`, [
          { campo: 'correo_electronico', mensaje: 'Este correo ya esta en uso.' },
        ]);
      }

      aplicar.correo_electronico = correo;
    }
  }

  if (Object.keys(aplicar).length === 0 && errores.length === 0) {
    throw errorSolicitud(
      `No se envio ningun campo modificable. Los campos editables son: ${CAMPOS_EDITABLES.join(', ')}.`
    );
  }

  lanzarSiHayErrores(errores);

  return Usuario.actualizar(idUsuario, aplicar);
}

/**
 * Cambia la contrasena, exigiendo la actual.
 *
 * Pedir la contrasena vigente protege contra el secuestro de una sesion
 * abierta: quien se siente frente a un computador desatendido no podra cambiar
 * la clave sin conocerla.
 *
 * @throws {ErrorHttp} 404 si no existe, 400 datos invalidos, 401 si la actual
 *                     no coincide.
 */
export function cambiarContrasena(id, datos = {}) {
  const idUsuario = exigirIdValido(id);

  const usuario = Usuario.obtenerPorId(idUsuario);
  if (!usuario) {
    throw errorNoEncontrado(`No existe el usuario con id ${idUsuario}.`);
  }

  const errores = [];
  const actual = validarContrasena(datos.contrasena_actual, 'contrasena_actual', errores);
  const nueva = validarContrasena(datos.contrasena_nueva, 'contrasena_nueva', errores);

  lanzarSiHayErrores(errores);

  if (actual === nueva) {
    throw errorSolicitud('La contrasena nueva debe ser distinta de la actual.');
  }

  const registro = Usuario.obtenerParaLogin(usuario.correo_electronico);

  if (!bcrypt.compareSync(actual, registro.contrasena_hash)) {
    throw errorConflicto('La contrasena actual no es correcta.');
  }

  Usuario.actualizar(idUsuario, { contrasena_hash: calcularHash(nueva) });

  // No se devuelve el usuario para no dar la impresion de que la respuesta
  // contiene algo relacionado con la contrasena.
  return { id_usuario: idUsuario, contrasena_actualizada: true };
}

/**
 * Elimina un usuario, siempre que no tenga rastro en el sistema.
 *
 * Las claves foraneas reportado_por (INCIDENCIA) y modificado_por
 * (HISTORIAL_INCIDENCIA) estan declaradas ON DELETE RESTRICT: borrar a alguien
 * que reporto incidencias o hizo cambios destruiria la trazabilidad exigida en
 * el Cap. IV.5. Las incidencias que solo tenia ASIGNADAS no son impedimento:
 * esa clave es ON DELETE SET NULL y simplemente quedan sin responsable.
 *
 * @throws {ErrorHttp} 404 si no existe, 409 si tiene historial en el sistema.
 */
export function eliminarUsuario(id) {
  const idUsuario = exigirIdValido(id);

  if (!Usuario.existe(idUsuario)) {
    throw errorNoEncontrado(`No existe el usuario con id ${idUsuario}.`);
  }

  const { reportadas, cambiosHistorial, asignadas } = Usuario.contarDependencias(idUsuario);

  if (reportadas > 0 || cambiosHistorial > 0) {
    const motivos = [];
    if (reportadas > 0) motivos.push(`${reportadas} incidencia(s) reportada(s)`);
    if (cambiosHistorial > 0) motivos.push(`${cambiosHistorial} cambio(s) registrado(s) en el historial`);

    throw errorConflicto(
      `No se puede eliminar el usuario: tiene ${motivos.join(' y ')}.`,
      [
        {
          campo: 'id_usuario',
          mensaje:
            'Eliminarlo destruiria la trazabilidad de esas incidencias. Considera cambiarle el rol o dejar la cuenta inactiva en lugar de borrarla.',
        },
      ]
    );
  }

  Usuario.eliminar(idUsuario);

  return {
    id_usuario: idUsuario,
    eliminado: true,
    // Se informa el efecto colateral para que no sea una sorpresa.
    incidencias_desasignadas: asignadas,
  };
}
