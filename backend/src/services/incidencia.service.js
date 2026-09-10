/**
 * Logica de negocio de INCIDENCIA.
 *
 * Esta es la capa que decide. El model sabe COMO guardar; el service sabe QUE
 * se puede guardar y bajo que condiciones.
 *
 * Responsabilidades:
 *   - Validar los datos que llegan desde afuera.
 *   - Aplicar valores por defecto.
 *   - Comprobar que las claves foraneas apuntan a registros existentes.
 *   - Traducir situaciones de negocio en errores con codigo HTTP.
 *
 * Sigue sin conocer Express: no recibe `req` ni `res`. Recibe objetos comunes
 * y devuelve objetos comunes. Gracias a eso se puede probar desde node:test
 * sin levantar un servidor, y mas adelante reutilizar desde el motor de
 * clasificacion automatica.
 */
import * as Incidencia from '../models/incidencia.model.js';
import * as Historial from '../models/historial.model.js';
import * as Proyecto from '../models/proyecto.model.js';
import * as Usuario from '../models/usuario.model.js';
import { enTransaccion, ahora } from '../db/database.js';
import { errorSolicitud, errorNoEncontrado, errorConflicto } from '../utils/errores.js';
import {
  vino,
  validarTexto,
  validarEnumerado,
  validarId,
  validarEntero,
  validarReferencia,
  lanzarSiHayErrores,
  exigirIdValido,
} from '../utils/validacion.js';

// ---------------------------------------------------------------------------
// Valores admitidos
// ---------------------------------------------------------------------------

// Estas listas repiten los CHECK del esquema SQL a proposito. La base de datos
// es la ultima linea de defensa y debe mantener sus restricciones; pero si se
// dejara que ella sola rechazara los valores, el usuario recibiria un error
// tecnico ("CHECK constraint failed: INCIDENCIA") con codigo 500. Validando
// aqui primero, recibe un 400 que explica que se esperaba.
//
// Regla practica: si se agrega un valor nuevo, hay que tocar schema.sql Y esta
// lista. Es el precio de dar buenos mensajes de error.

export const PRIORIDADES = ['ALTA', 'MEDIA', 'BAJA'];
export const ESTADOS = ['ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'CERRADA'];
export const CATEGORIAS = [
  'DISPONIBILIDAD',
  'RENDIMIENTO',
  'SEGURIDAD',
  'USABILIDAD_INTERFAZ',
  'DATOS_INTEGRIDAD',
  'OTRO',
];

// Toda incidencia nace ABIERTA: es el punto de partida del flujo de estados.
const ESTADO_INICIAL = 'ABIERTA';

/**
 * Maquina de estados: para cada estado, a cuales puede pasar.
 *
 *     ABIERTA --> EN_PROGRESO --> RESUELTA --> CERRADA
 *        |             ^              |            ^
 *        |             +--------------+            |
 *        |    (la solucion no se valida bien)      |
 *        +----------------------------------------+
 *              (cierre sin resolucion: duplicada,
 *               no se reproduce, no aplica)
 *
 * Esta tabla es la traduccion del diagrama del Cap. IV.5. Tenerla como dato, y
 * no repartida en una cadena de if, tiene tres ventajas:
 *   - se lee de un vistazo y se contrasta con el diagrama de la memoria,
 *   - cambiar el flujo es editar esta tabla y nada mas,
 *   - se le puede preguntar "que se puede hacer ahora", que es justo lo que
 *     el frontend necesita para saber que botones habilitar.
 *
 * Por que vive en el service y no en la base de datos: SQL puede restringir
 * QUE valores son admisibles (eso lo hace el CHECK del esquema), pero no en
 * QUE ORDEN pueden ocurrir. Para saber si un cambio es legal hay que conocer
 * el estado anterior, y eso es una regla de negocio.
 *
 * Sobre ABIERTA -> CERRADA: es el atajo para las incidencias que se cierran
 * sin trabajarlas. El caso principal lo genera el propio sistema: cuando el
 * detector de duplicados marca una incidencia como repetida, obligarla a
 * recorrer EN_PROGRESO y RESUELTA seria registrar un trabajo que nunca
 * ocurrio y ensuciar las metricas de tiempo de resolucion. Como en este
 * camino no hay resolucion real, fecha_resolucion queda en null.
 *
 * CERRADA no tiene salidas: es un estado final. Si el proyecto necesitara
 * reabrir incidencias ya cerradas, se agrega 'EN_PROGRESO' a su lista y el
 * resto del codigo se adapta solo.
 */
export const TRANSICIONES = {
  ABIERTA: ['EN_PROGRESO', 'CERRADA'],
  EN_PROGRESO: ['RESUELTA'],
  RESUELTA: ['EN_PROGRESO', 'CERRADA'],
  CERRADA: [],
};

/**
 * Transiciones en las que el comentario deja de ser opcional.
 *
 * Cerrar algo sin haberlo trabajado siempre tiene un motivo (esta duplicada,
 * no se reproduce, no aplica), y ese motivo es la unica explicacion que va a
 * quedar en la bitacora. Sin el, dentro de seis meses nadie podra decir por
 * que esa incidencia se cerro sin tocarla.
 *
 * Para volver a hacerlo opcional basta con vaciar este conjunto.
 */
const TRANSICIONES_QUE_EXIGEN_MOTIVO = new Set(['ABIERTA->CERRADA']);

const LARGO_COMENTARIO = { min: 3, max: 1000 };

/**
 * Estados a los que se puede pasar desde el estado indicado.
 * Se exporta para que el controlador pueda incluirlo en sus respuestas.
 */
export function transicionesPosibles(estado) {
  return TRANSICIONES[estado] ?? [];
}

// Cuando no se indican, el motor de clasificacion automatica (semanas 6-7) se
// encargara de deducirlos desde el texto. Mientras tanto se usan estos.
const PRIORIDAD_POR_DEFECTO = 'MEDIA';
const CATEGORIA_POR_DEFECTO = 'OTRO';

const LARGO_TITULO = { min: 5, max: 150 };
const LARGO_DESCRIPCION = { min: 10, max: 5000 };

const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 100;

/**
 * Campos que el cliente puede modificar con actualizarIncidencia().
 *
 * Es intencionalmente MAS CORTA que CAMPOS_ACTUALIZABLES del model. El model
 * permite escribir tambien `estado`, `fecha_resolucion` y
 * `clasificacion_automatica` porque esas columnas si deben poder cambiar...
 * pero solo desde adentro del sistema (la maquina de estados y el motor de
 * clasificacion), nunca por peticion directa del cliente.
 *
 * Dicho de otro modo: la lista blanca del model protege contra columnas
 * inventadas; la del service protege contra operaciones no autorizadas.
 */
const CAMPOS_EDITABLES = [
  'titulo',
  'descripcion',
  'prioridad',
  'categoria',
  'id_proyecto',
  'asignado_a',
  'posible_duplicado_de',
];

/** Campos que el cliente NO puede tocar, con el motivo que se le informara. */
const CAMPOS_RESERVADOS = {
  estado:
    'El estado no se modifica por esta via. Usa la transicion de estado para que quede registrada en el historial.',
  fecha_resolucion: 'La fecha de resolucion la asigna el sistema al resolver la incidencia.',
  clasificacion_automatica: 'Lo determina el motor de clasificacion, no el cliente.',
  reportado_por: 'Quien reporto la incidencia es un dato historico y no se reasigna.',
};

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------

/**
 * Lista incidencias con filtros y paginacion.
 *
 * Los filtros invalidos se rechazan con 400 en lugar de ignorarse. Si alguien
 * pide `?estado=CERRADO` (sin la A final) y la API devolviera silenciosamente
 * la lista completa, pensaria que no hay incidencias cerradas. Es preferible
 * decirle que el valor esta mal escrito.
 *
 * @returns {{ datos: object[], paginacion: object }}
 */
export function listarIncidencias(consulta = {}) {
  const errores = [];
  const filtros = {};

  if (vino(consulta.estado)) {
    filtros.estado = validarEnumerado(consulta.estado, ESTADOS, 'estado', errores);
  }
  if (vino(consulta.prioridad)) {
    filtros.prioridad = validarEnumerado(consulta.prioridad, PRIORIDADES, 'prioridad', errores);
  }
  if (vino(consulta.categoria)) {
    filtros.categoria = validarEnumerado(consulta.categoria, CATEGORIAS, 'categoria', errores);
  }
  if (vino(consulta.id_proyecto)) {
    filtros.id_proyecto = validarId(consulta.id_proyecto, 'id_proyecto', errores);
  }
  if (vino(consulta.asignado_a)) {
    filtros.asignado_a = validarId(consulta.asignado_a, 'asignado_a', errores);
  }
  if (vino(consulta.reportado_por)) {
    filtros.reportado_por = validarId(consulta.reportado_por, 'reportado_por', errores);
  }
  if (vino(consulta.busqueda)) {
    filtros.busqueda = String(consulta.busqueda).trim();
  }

  // El limite tiene tope maximo para que nadie pueda pedir ?limite=999999 y
  // obligar al servidor a serializar la tabla entera en una sola respuesta.
  const limite = validarEntero(
    consulta.limite,
    'limite',
    { min: 1, max: LIMITE_MAXIMO, porDefecto: LIMITE_POR_DEFECTO },
    errores
  );

  // Se expone `pagina` (1, 2, 3...) en lugar de `desplazamiento` (0, 50, 100)
  // porque es lo que el frontend necesita mostrar. La conversion se hace aqui.
  const pagina = validarEntero(
    consulta.pagina,
    'pagina',
    { min: 1, max: Number.MAX_SAFE_INTEGER, porDefecto: 1 },
    errores
  );

  lanzarSiHayErrores(errores);

  filtros.limite = limite;
  filtros.desplazamiento = (pagina - 1) * limite;

  // Estos dos no se validan: el model los resuelve contra su propia lista
  // blanca y cae en el valor por defecto si no calzan.
  filtros.ordenarPor = consulta.ordenarPor;
  filtros.direccion = consulta.direccion;

  const datos = Incidencia.listar(filtros);
  const total = Incidencia.contar(filtros);

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
 * Devuelve una incidencia por su id.
 * @throws {ErrorHttp} 404 si no existe.
 */
export function obtenerIncidencia(id) {
  const idIncidencia = exigirIdValido(id);
  const incidencia = Incidencia.obtenerPorId(idIncidencia);

  if (!incidencia) {
    throw errorNoEncontrado(`No existe la incidencia con id ${idIncidencia}.`);
  }

  return incidencia;
}

/**
 * Crea una incidencia.
 *
 * Obligatorios: titulo, descripcion, id_proyecto, reportado_por.
 * Opcionales:   prioridad, categoria, asignado_a.
 *
 * Campos que el cliente no controla:
 *   estado                    siempre ABIERTA (ver ESTADO_INICIAL).
 *   clasificacion_automatica  0 mientras el motor no exista.
 *   posible_duplicado_de      null; lo llenara el detector de duplicados.
 *
 * Si el cliente manda `estado` en el cuerpo, se ignora en silencio: solo hay
 * un valor legal al crear, asi que forzarlo no le quita nada. En cambio al
 * ACTUALIZAR el mismo campo se rechaza con un error, porque ahi ignorarlo si
 * seria una sorpresa: el usuario creeria haber cerrado la incidencia.
 *
 * @param {object} datos            Cuerpo de la peticion.
 * @param {number} idUsuarioSesion  Quien reporta. Viene de la sesion, NO del
 *                                  cuerpo: si el cliente pudiera declararlo,
 *                                  cualquiera podria registrar incidencias a
 *                                  nombre de otra persona.
 */
export function crearIncidencia(datos = {}, idUsuarioSesion) {
  const errores = [];

  const titulo = validarTexto(datos.titulo, 'titulo', LARGO_TITULO, errores);
  const descripcion = validarTexto(datos.descripcion, 'descripcion', LARGO_DESCRIPCION, errores);

  const prioridad = vino(datos.prioridad)
    ? validarEnumerado(datos.prioridad, PRIORIDADES, 'prioridad', errores)
    : PRIORIDAD_POR_DEFECTO;

  const categoria = vino(datos.categoria)
    ? validarEnumerado(datos.categoria, CATEGORIAS, 'categoria', errores)
    : CATEGORIA_POR_DEFECTO;

  // --- Claves foraneas ---
  // Dos pasos por cada una: primero que el valor sea un id valido, y despues
  // que ese id exista realmente en la base.

  let idProyecto;
  if (vino(datos.id_proyecto)) {
    idProyecto = validarId(datos.id_proyecto, 'id_proyecto', errores);
    idProyecto = validarReferencia(idProyecto, 'id_proyecto', Proyecto.existe, 'el proyecto', errores);
  } else {
    errores.push({ campo: 'id_proyecto', mensaje: 'Es obligatorio.' });
  }

  // reportado_por sale de la sesion, no del cuerpo. Si llega en el JSON se
  // rechaza en vez de ignorarse: quien lo envio cree estar decidiendo algo, y
  // conviene que sepa que no es asi.
  if (Object.hasOwn(datos, 'reportado_por')) {
    errores.push({
      campo: 'reportado_por',
      mensaje: 'No se envia: la incidencia queda a nombre del usuario que inicio sesion.',
    });
  }

  const reportadoPor = validarReferencia(
    validarId(idUsuarioSesion, 'sesion', errores),
    'sesion',
    Usuario.existe,
    'el usuario',
    errores
  );

  // asignado_a es opcional: una incidencia recien reportada puede no tener
  // responsable todavia. null es un valor perfectamente valido.
  let asignadoA = null;
  if (vino(datos.asignado_a)) {
    asignadoA = validarId(datos.asignado_a, 'asignado_a', errores);
    asignadoA = validarReferencia(asignadoA, 'asignado_a', Usuario.existe, 'el usuario', errores);
  }

  lanzarSiHayErrores(errores);

  // Crear la incidencia son DOS escrituras: la fila en INCIDENCIA y la primera
  // linea de su bitacora. La transaccion garantiza que no pueda quedar una sin
  // la otra. Es el unico registro del historial con estado_anterior = null,
  // tal como lo previo el esquema: no venia de ningun estado, esta naciendo.
  return enTransaccion(() => {
    const incidencia = Incidencia.crear({
      titulo,
      descripcion,
      prioridad,
      estado: ESTADO_INICIAL,
      categoria,
      clasificacion_automatica: 0,
      posible_duplicado_de: null,
      id_proyecto: idProyecto,
      reportado_por: reportadoPor,
      asignado_a: asignadoA ?? null,
    });

    Historial.registrar({
      id_incidencia: incidencia.id_incidencia,
      estado_anterior: null,
      estado_nuevo: ESTADO_INICIAL,
      modificado_por: reportadoPor,
      comentario: 'Incidencia registrada en el sistema.',
    });

    return incidencia;
  });
}

/**
 * Actualiza parcialmente una incidencia.
 *
 * Solo se tocan los campos presentes en `cambios`. Mandar `asignado_a: null`
 * es una operacion valida y significa "quitar el responsable"; por eso se usa
 * Object.hasOwn y no una comprobacion de valor.
 *
 * @throws {ErrorHttp} 404 si no existe, 400 si los datos no son validos.
 */
export function actualizarIncidencia(id, cambios = {}) {
  const idIncidencia = exigirIdValido(id);

  // Se comprueba la existencia ANTES de validar: si la incidencia no existe,
  // el problema real es ese, y no que el titulo sea corto.
  const actual = Incidencia.obtenerCrudo(idIncidencia);
  if (!actual) {
    throw errorNoEncontrado(`No existe la incidencia con id ${idIncidencia}.`);
  }

  const errores = [];

  // Campos reservados: se rechazan explicitamente para que quien consume la
  // API entienda por que su cambio no se aplico.
  for (const [campo, motivo] of Object.entries(CAMPOS_RESERVADOS)) {
    if (Object.hasOwn(cambios, campo)) {
      errores.push({ campo, mensaje: motivo });
    }
  }

  const aplicar = {};

  if (Object.hasOwn(cambios, 'titulo')) {
    aplicar.titulo = validarTexto(cambios.titulo, 'titulo', LARGO_TITULO, errores);
  }

  if (Object.hasOwn(cambios, 'descripcion')) {
    aplicar.descripcion = validarTexto(
      cambios.descripcion,
      'descripcion',
      LARGO_DESCRIPCION,
      errores
    );
  }

  if (Object.hasOwn(cambios, 'prioridad')) {
    aplicar.prioridad = validarEnumerado(cambios.prioridad, PRIORIDADES, 'prioridad', errores);
  }

  if (Object.hasOwn(cambios, 'categoria')) {
    aplicar.categoria = validarEnumerado(cambios.categoria, CATEGORIAS, 'categoria', errores);
  }

  if (Object.hasOwn(cambios, 'id_proyecto')) {
    const idProyecto = validarId(cambios.id_proyecto, 'id_proyecto', errores);
    aplicar.id_proyecto = validarReferencia(
      idProyecto,
      'id_proyecto',
      Proyecto.existe,
      'el proyecto',
      errores
    );
  }

  if (Object.hasOwn(cambios, 'asignado_a')) {
    if (cambios.asignado_a === null) {
      aplicar.asignado_a = null; // desasignar
    } else {
      const idUsuario = validarId(cambios.asignado_a, 'asignado_a', errores);
      aplicar.asignado_a = validarReferencia(
        idUsuario,
        'asignado_a',
        Usuario.existe,
        'el usuario',
        errores
      );
    }
  }

  if (Object.hasOwn(cambios, 'posible_duplicado_de')) {
    if (cambios.posible_duplicado_de === null) {
      aplicar.posible_duplicado_de = null; // descartar la marca de duplicado
    } else {
      const idDuplicado = validarId(cambios.posible_duplicado_de, 'posible_duplicado_de', errores);

      // El esquema tiene un CHECK que impide esto, pero se valida aqui para
      // dar un mensaje entendible en vez de un error de restriccion.
      if (idDuplicado === idIncidencia) {
        errores.push({
          campo: 'posible_duplicado_de',
          mensaje: 'Una incidencia no puede ser duplicada de si misma.',
        });
      } else {
        aplicar.posible_duplicado_de = validarReferencia(
          idDuplicado,
          'posible_duplicado_de',
          Incidencia.existe,
          'la incidencia',
          errores
        );
      }
    }
  }

  // Un PUT que no cambia nada casi siempre es un error de quien llama: se
  // equivoco en el nombre de los campos. Conviene avisarle.
  if (Object.keys(aplicar).length === 0 && errores.length === 0) {
    throw errorSolicitud(
      `No se envio ningun campo modificable. Los campos editables son: ${CAMPOS_EDITABLES.join(', ')}.`
    );
  }

  lanzarSiHayErrores(errores);

  return Incidencia.actualizar(idIncidencia, aplicar);
}

// ---------------------------------------------------------------------------
// Maquina de estados
// ---------------------------------------------------------------------------

/**
 * Cambia el estado de una incidencia y lo deja registrado en la bitacora.
 *
 * Es la UNICA via para modificar la columna `estado`. Por eso actualizarIncidencia()
 * rechaza ese campo: si existieran dos caminos, uno de ellos terminaria
 * saltandose el historial y las metricas quedarian incompletas.
 *
 * Tres cosas ocurren aqui, y las tres o ninguna:
 *   1. Se valida que la transicion sea legal segun TRANSICIONES.
 *   2. Se actualiza el estado (y la fecha de resolucion, si corresponde).
 *   3. Se agrega la linea al historial.
 *
 * @param {number|string} id
 * @param {object} datos
 * @param {string} datos.estado         Estado al que se quiere pasar.
 * @param {string} [datos.comentario]   Motivo, opcional pero recomendado.
 * @param {number} idUsuarioSesion      Quien realiza el cambio. Viene de la
 *                                      sesion, NO del cuerpo: la bitacora es
 *                                      la base de la trazabilidad del
 *                                      Cap. IV.5, y si el cliente pudiera
 *                                      declarar el autor, seria falsificable.
 * @throws {ErrorHttp} 404 si no existe, 400 si los datos son invalidos,
 *                     409 si la transicion no esta permitida.
 */
export function cambiarEstado(id, datos = {}, idUsuarioSesion) {
  const idIncidencia = exigirIdValido(id);

  const actual = Incidencia.obtenerCrudo(idIncidencia);
  if (!actual) {
    throw errorNoEncontrado(`No existe la incidencia con id ${idIncidencia}.`);
  }

  // --- Paso 1: validar el formato de lo que llego (400) ---

  const errores = [];

  let estadoNuevo;
  if (vino(datos.estado)) {
    estadoNuevo = validarEnumerado(datos.estado, ESTADOS, 'estado', errores);
  } else {
    errores.push({ campo: 'estado', mensaje: 'Es obligatorio: indica el estado al que se quiere pasar.' });
  }

  // El autor del cambio sale de la sesion. El esquema declara modificado_por
  // NOT NULL justamente porque un cambio de estado sin responsable dejaria la
  // bitacora sin valor; tomarlo de la sesion asegura ademas que el responsable
  // sea el real y no el que alguien quiso escribir.
  if (Object.hasOwn(datos, 'modificado_por')) {
    errores.push({
      campo: 'modificado_por',
      mensaje: 'No se envia: el cambio queda a nombre del usuario que inicio sesion.',
    });
  }

  const modificadoPor = validarReferencia(
    validarId(idUsuarioSesion, 'sesion', errores),
    'sesion',
    Usuario.existe,
    'el usuario',
    errores
  );

  let comentario = null;
  if (vino(datos.comentario)) {
    comentario = validarTexto(datos.comentario, 'comentario', LARGO_COMENTARIO, errores);
  }

  lanzarSiHayErrores(errores);

  // --- Paso 2: validar que la transicion sea legal (409) ---
  //
  // Se usa 409 Conflict y no 400 Bad Request porque la peticion esta bien
  // formada: 'CERRADA' es un estado que existe y el usuario tambien. Lo que
  // falla es que la operacion no corresponde en el estado actual. La misma
  // peticion, enviada mas adelante, podria ser perfectamente valida.

  const permitidas = transicionesPosibles(actual.estado);

  if (estadoNuevo === actual.estado) {
    throw errorConflicto(`La incidencia ya se encuentra en estado ${actual.estado}.`, [
      { campo: 'estado', mensaje: `Transiciones posibles: ${permitidas.join(', ') || 'ninguna'}.` },
    ]);
  }

  if (!permitidas.includes(estadoNuevo)) {
    const mensaje =
      permitidas.length === 0
        ? `La incidencia esta ${actual.estado} y ese es un estado final: no admite mas cambios.`
        : `No se puede pasar de ${actual.estado} a ${estadoNuevo}.`;

    throw errorConflicto(mensaje, [
      {
        campo: 'estado',
        mensaje: `Estado actual: ${actual.estado}. Transiciones posibles: ${permitidas.join(', ') || 'ninguna'}.`,
      },
    ]);
  }

  // --- Paso 2b: exigir motivo donde corresponde (400) ---
  //
  // Se comprueba despues de validar la transicion porque solo tiene sentido
  // pedir explicaciones por un cambio que efectivamente se puede hacer.

  if (TRANSICIONES_QUE_EXIGEN_MOTIVO.has(`${actual.estado}->${estadoNuevo}`) && !comentario) {
    throw errorSolicitud(
      `Pasar de ${actual.estado} a ${estadoNuevo} requiere un comentario que explique el motivo.`,
      [
        {
          campo: 'comentario',
          mensaje:
            'Es obligatorio al cerrar una incidencia sin resolverla. Por ejemplo: "duplicada de la #12", "no se reproduce", "no aplica".',
        },
      ]
    );
  }

  // --- Paso 3: aplicar el cambio ---

  const cambios = { estado: estadoNuevo };

  // fecha_resolucion es un dato derivado del estado, asi que se mantiene aqui
  // y nunca a mano (por eso actualizarIncidencia lo tiene como reservado).
  if (estadoNuevo === 'RESUELTA') {
    cambios.fecha_resolucion = ahora();
  } else if (actual.estado === 'RESUELTA' && estadoNuevo === 'EN_PROGRESO') {
    // Reapertura: la solucion no se valido, asi que la incidencia vuelve a
    // estar sin resolver y la fecha anterior deja de ser cierta.
    // Al pasar de RESUELTA a CERRADA, en cambio, la fecha se conserva: ahi es
    // cuando el dato queda definitivo para las metricas de tiempo de resolucion.
    cambios.fecha_resolucion = null;
  }

  return enTransaccion(() => {
    Incidencia.actualizar(idIncidencia, cambios);

    Historial.registrar({
      id_incidencia: idIncidencia,
      estado_anterior: actual.estado,
      estado_nuevo: estadoNuevo,
      modificado_por: modificadoPor,
      comentario,
    });

    // Se devuelve la incidencia ya actualizada junto con lo que se puede hacer
    // a continuacion, para que el frontend habilite los botones correctos sin
    // tener que conocer la maquina de estados.
    return {
      ...Incidencia.obtenerPorId(idIncidencia),
      transiciones_posibles: transicionesPosibles(estadoNuevo),
    };
  });
}

/**
 * Devuelve la bitacora completa de una incidencia.
 * @throws {ErrorHttp} 404 si la incidencia no existe.
 */
export function obtenerHistorial(id) {
  const idIncidencia = exigirIdValido(id);

  // Se comprueba la existencia para poder distinguir dos situaciones que de
  // otro modo se verian iguales: "la incidencia no existe" (404) y "existe
  // pero no tiene movimientos" (200 con lista vacia).
  if (!Incidencia.existe(idIncidencia)) {
    throw errorNoEncontrado(`No existe la incidencia con id ${idIncidencia}.`);
  }

  return Historial.listarPorIncidencia(idIncidencia);
}

/**
 * Elimina una incidencia.
 *
 * Efectos en cascada definidos en el esquema:
 *   - Su HISTORIAL_INCIDENCIA se borra tambien (ON DELETE CASCADE).
 *   - Las incidencias que la senalaban como duplicada quedan con
 *     posible_duplicado_de = NULL (ON DELETE SET NULL), no se borran.
 *
 * @throws {ErrorHttp} 404 si no existe.
 */
export function eliminarIncidencia(id) {
  const idIncidencia = exigirIdValido(id);

  if (!Incidencia.eliminar(idIncidencia)) {
    throw errorNoEncontrado(`No existe la incidencia con id ${idIncidencia}.`);
  }

  return { id_incidencia: idIncidencia, eliminada: true };
}
