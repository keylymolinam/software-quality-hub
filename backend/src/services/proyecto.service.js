/**
 * Logica de negocio de PROYECTO.
 *
 * Mismo patron que incidencia.service.js, con dos diferencias propias de esta
 * entidad:
 *
 *   1. `estado` es un enumerado simple, sin maquina de estados. Un proyecto
 *      puede pasar de ACTIVO a PAUSADO y volver, o darse por FINALIZADO y
 *      reactivarse, sin que ningun orden sea incorrecto. No hay flujo que
 *      hacer cumplir, asi que se edita con el PUT normal.
 *
 *   2. Eliminar tiene una condicion: el proyecto no puede tener incidencias.
 *      Es la regla que hace falta traducir a un mensaje entendible.
 */
import * as Proyecto from '../models/proyecto.model.js';
import { errorNoEncontrado, errorConflicto, errorSolicitud } from '../utils/errores.js';
import {
  vino,
  validarTexto,
  validarEnumerado,
  validarEntero,
  validarFecha,
  lanzarSiHayErrores,
  exigirIdValido,
} from '../utils/validacion.js';

// ---------------------------------------------------------------------------
// Valores admitidos
// ---------------------------------------------------------------------------

// Refleja el CHECK de schema.sql. Igual que en incidencias: la base es la
// ultima linea de defensa, pero validar aqui permite responder 400 con una
// explicacion en vez de un 500 con un error de restriccion.
export const ESTADOS_PROYECTO = ['ACTIVO', 'FINALIZADO', 'PAUSADO'];

// Un proyecto se crea para trabajar en el.
const ESTADO_POR_DEFECTO = 'ACTIVO';

const LARGO_NOMBRE = { min: 3, max: 100 };
const LARGO_DESCRIPCION = { min: 10, max: 1000 };

const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 100;

/** Campos que el cliente puede modificar. Aqui coincide con las columnas. */
const CAMPOS_EDITABLES = ['nombre', 'descripcion', 'fecha_inicio', 'estado'];

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------

/**
 * Lista proyectos con filtros y paginacion.
 * @returns {{ datos: object[], paginacion: object }}
 */
export function listarProyectos(consulta = {}) {
  const errores = [];
  const filtros = {};

  if (vino(consulta.estado)) {
    filtros.estado = validarEnumerado(consulta.estado, ESTADOS_PROYECTO, 'estado', errores);
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

  const datos = Proyecto.listar(filtros);
  const total = Proyecto.contar(filtros);

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
 * Devuelve un proyecto por su id, con el recuento de sus incidencias.
 * @throws {ErrorHttp} 404 si no existe.
 */
export function obtenerProyecto(id) {
  const idProyecto = exigirIdValido(id);
  const proyecto = Proyecto.obtenerPorId(idProyecto);

  if (!proyecto) {
    throw errorNoEncontrado(`No existe el proyecto con id ${idProyecto}.`);
  }

  return proyecto;
}

/**
 * Crea un proyecto.
 *
 * Obligatorio: nombre.
 * Opcionales:  descripcion, fecha_inicio, estado.
 *
 * `descripcion` y `fecha_inicio` admiten nulo porque el esquema los declara
 * asi: un proyecto puede registrarse antes de tener fecha de inicio definida.
 */
export function crearProyecto(datos = {}) {
  const errores = [];

  const nombre = validarTexto(datos.nombre, 'nombre', LARGO_NOMBRE, errores);

  const descripcion = vino(datos.descripcion)
    ? validarTexto(datos.descripcion, 'descripcion', LARGO_DESCRIPCION, errores)
    : null;

  const fechaInicio = vino(datos.fecha_inicio)
    ? validarFecha(datos.fecha_inicio, 'fecha_inicio', errores)
    : null;

  const estado = vino(datos.estado)
    ? validarEnumerado(datos.estado, ESTADOS_PROYECTO, 'estado', errores)
    : ESTADO_POR_DEFECTO;

  lanzarSiHayErrores(errores);

  return Proyecto.crear({
    nombre,
    descripcion,
    fecha_inicio: fechaInicio,
    estado,
  });
}

/**
 * Actualiza parcialmente un proyecto.
 *
 * Enviar `descripcion: null` o `fecha_inicio: null` es valido y significa
 * vaciar ese dato, por lo mismo que en incidencias: Object.hasOwn distingue
 * "no vino el campo" de "vino con valor nulo".
 *
 * @throws {ErrorHttp} 404 si no existe, 400 si los datos no son validos.
 */
export function actualizarProyecto(id, cambios = {}) {
  const idProyecto = exigirIdValido(id);

  if (!Proyecto.existe(idProyecto)) {
    throw errorNoEncontrado(`No existe el proyecto con id ${idProyecto}.`);
  }

  const errores = [];
  const aplicar = {};

  if (Object.hasOwn(cambios, 'nombre')) {
    aplicar.nombre = validarTexto(cambios.nombre, 'nombre', LARGO_NOMBRE, errores);
  }

  if (Object.hasOwn(cambios, 'descripcion')) {
    aplicar.descripcion =
      cambios.descripcion === null
        ? null
        : validarTexto(cambios.descripcion, 'descripcion', LARGO_DESCRIPCION, errores);
  }

  if (Object.hasOwn(cambios, 'fecha_inicio')) {
    aplicar.fecha_inicio =
      cambios.fecha_inicio === null
        ? null
        : validarFecha(cambios.fecha_inicio, 'fecha_inicio', errores);
  }

  if (Object.hasOwn(cambios, 'estado')) {
    aplicar.estado = validarEnumerado(cambios.estado, ESTADOS_PROYECTO, 'estado', errores);
  }

  if (Object.keys(aplicar).length === 0 && errores.length === 0) {
    throw errorSolicitud(
      `No se envio ningun campo modificable. Los campos editables son: ${CAMPOS_EDITABLES.join(', ')}.`
    );
  }

  lanzarSiHayErrores(errores);

  return Proyecto.actualizar(idProyecto, aplicar);
}

/**
 * Elimina un proyecto, siempre que no tenga incidencias asociadas.
 *
 * La clave foranea de INCIDENCIA esta declarada ON DELETE RESTRICT: si el
 * proyecto tiene incidencias, SQLite aborta el borrado. Dejar que ocurra asi
 * daria un error tecnico con codigo 500 ("FOREIGN KEY constraint failed"),
 * cuando en realidad el servidor funciona perfectamente y lo que ocurre es que
 * la operacion no corresponde. Por eso se comprueba antes y se responde 409.
 *
 * Se responde 409 y no 400 por la misma razon que en las transiciones de
 * estado: la peticion esta bien formada, el proyecto existe, el id es valido.
 * Lo que impide borrarlo es el estado actual del sistema, y eso puede cambiar:
 * si despues se mueven o eliminan esas incidencias, la misma peticion
 * funcionara.
 *
 * Sobre no borrar en cascada: seria destruir el historial de trabajo completo
 * de un equipo por un clic. El RESTRICT obliga a decidir explicitamente que
 * hacer con las incidencias antes de eliminar el proyecto.
 *
 * @throws {ErrorHttp} 404 si no existe, 409 si tiene incidencias.
 */
export function eliminarProyecto(id) {
  const idProyecto = exigirIdValido(id);

  if (!Proyecto.existe(idProyecto)) {
    throw errorNoEncontrado(`No existe el proyecto con id ${idProyecto}.`);
  }

  const incidencias = Proyecto.contarIncidencias(idProyecto);

  if (incidencias > 0) {
    throw errorConflicto(
      `No se puede eliminar el proyecto: tiene ${incidencias} ${
        incidencias === 1 ? 'incidencia asociada' : 'incidencias asociadas'
      }.`,
      [
        {
          campo: 'id_proyecto',
          mensaje:
            'Reasigna o elimina primero sus incidencias. Si el proyecto ya termino, considera cambiarlo a estado FINALIZADO en lugar de borrarlo.',
        },
      ]
    );
  }

  Proyecto.eliminar(idProyecto);

  return { id_proyecto: idProyecto, eliminado: true };
}
