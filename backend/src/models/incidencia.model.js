/**
 * Model de INCIDENCIA.
 *
 * Los models son la capa de persistencia: el UNICO lugar del sistema donde se
 * escribe SQL. Su responsabilidad empieza y termina en traducir entre filas de
 * la base de datos y objetos JavaScript.
 *
 * Lo que un model NO hace:
 *   - No valida datos             -> eso es del service.
 *   - No decide codigos HTTP      -> eso es del controlador.
 *   - No aplica reglas de negocio -> eso es del service.
 *
 * Ejemplo concreto: si se pide eliminar una incidencia inexistente, este
 * archivo devuelve `false` sin protestar. Interpretar ese `false` como un
 * error 404 le corresponde a la capa de arriba.
 *
 * Seguridad: todos los valores viajan como parametros `?`. Nunca se pega un
 * dato del usuario dentro del texto de la consulta, porque eso permitiria
 * inyeccion SQL. Los nombres de columna si se concatenan, y por eso solo
 * pueden provenir de las listas blancas definidas mas abajo.
 */
import { db } from '../db/database.js';

// ---------------------------------------------------------------------------
// Listas blancas
// ---------------------------------------------------------------------------

/**
 * Filtros aceptados por listar(), y la condicion SQL que genera cada uno.
 * Si llega un filtro que no esta en esta tabla, simplemente se ignora.
 */
const FILTROS_PERMITIDOS = {
  id_proyecto: 'i.id_proyecto = ?',
  estado: 'i.estado = ?',
  categoria: 'i.categoria = ?',
  prioridad: 'i.prioridad = ?',
  asignado_a: 'i.asignado_a = ?',
  reportado_por: 'i.reportado_por = ?',
};

/**
 * Columnas que se pueden modificar con actualizar().
 *
 * Quedan fuera a proposito:
 *   id_incidencia   la clave primaria no se cambia,
 *   fecha_creacion  es historia, no se reescribe.
 */
const CAMPOS_ACTUALIZABLES = [
  'titulo',
  'descripcion',
  'prioridad',
  'estado',
  'categoria',
  'fecha_resolucion',
  'clasificacion_automatica',
  'posible_duplicado_de',
  'id_proyecto',
  'reportado_por',
  'asignado_a',
];

/** Columnas por las que se permite ordenar el listado. */
const ORDENES_PERMITIDOS = {
  fecha_creacion: 'i.fecha_creacion',
  prioridad: 'i.prioridad',
  estado: 'i.estado',
  titulo: 'i.titulo',
};

// ---------------------------------------------------------------------------
// Consulta base
// ---------------------------------------------------------------------------

/**
 * Las tres uniones traen los nombres legibles junto a la incidencia, para que
 * el frontend no tenga que pedir despues "quien es el usuario 3".
 *
 * LEFT JOIN (y no INNER JOIN) en el usuario asignado porque `asignado_a` puede
 * ser NULL: una incidencia sin asignar debe aparecer igual en el listado. Con
 * INNER JOIN esas filas desapareceria.
 */
const SELECT_BASE = `
  SELECT
      i.id_incidencia,
      i.titulo,
      i.descripcion,
      i.prioridad,
      i.estado,
      i.categoria,
      i.fecha_creacion,
      i.fecha_resolucion,
      i.clasificacion_automatica,
      i.posible_duplicado_de,
      i.id_proyecto,
      i.reportado_por,
      i.asignado_a,
      p.nombre  AS proyecto_nombre,
      ur.nombre AS reportado_por_nombre,
      ua.nombre AS asignado_a_nombre
    FROM INCIDENCIA i
    INNER JOIN PROYECTO p  ON p.id_proyecto = i.id_proyecto
    INNER JOIN USUARIO  ur ON ur.id_usuario = i.reportado_por
    LEFT  JOIN USUARIO  ua ON ua.id_usuario = i.asignado_a
`;

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/**
 * Arma la clausula WHERE a partir de los filtros recibidos.
 *
 * Devuelve el texto SQL y los valores por separado, en el mismo orden en que
 * aparecen los `?`. Ese orden importa: SQLite empareja cada `?` con el valor
 * de la misma posicion.
 *
 * Los filtros con valor undefined, null o cadena vacia se descartan, de modo
 * que "no filtrar por estado" y "filtrar por estado vacio" no se confundan.
 */
function construirWhere(filtros = {}) {
  const condiciones = [];
  const valores = [];

  for (const [campo, condicionSql] of Object.entries(FILTROS_PERMITIDOS)) {
    const valor = filtros[campo];
    if (valor === undefined || valor === null || valor === '') continue;

    condiciones.push(condicionSql);
    valores.push(valor);
  }

  // Busqueda libre de texto sobre titulo y descripcion.
  // LIKE con % a ambos lados equivale a "contiene". En SQLite LIKE no
  // distingue mayusculas de minusculas para caracteres ASCII.
  if (filtros.busqueda) {
    condiciones.push('(i.titulo LIKE ? OR i.descripcion LIKE ?)');
    valores.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
  }

  const clausula = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  return { clausula, valores };
}

// ---------------------------------------------------------------------------
// Operaciones de lectura
// ---------------------------------------------------------------------------

/**
 * Devuelve las incidencias que cumplen los filtros, ya paginadas.
 *
 * @param {object} filtros  id_proyecto, estado, categoria, prioridad,
 *                          asignado_a, reportado_por, busqueda,
 *                          ordenarPor, direccion, limite, desplazamiento.
 * @returns {object[]} Filas listas para entregar al frontend.
 */
export function listar(filtros = {}) {
  const { clausula, valores } = construirWhere(filtros);

  // El nombre de columna y la direccion se concatenan en el SQL, por eso NO
  // pueden venir crudos desde afuera: se resuelven contra las listas blancas
  // y, si no calzan, se usa el valor por defecto.
  const columnaOrden = ORDENES_PERMITIDOS[filtros.ordenarPor] ?? ORDENES_PERMITIDOS.fecha_creacion;
  const direccion = String(filtros.direccion).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const limite = Number.isInteger(filtros.limite) ? filtros.limite : 50;
  const desplazamiento = Number.isInteger(filtros.desplazamiento) ? filtros.desplazamiento : 0;

  const sql = `
    ${SELECT_BASE}
    ${clausula}
    ORDER BY ${columnaOrden} ${direccion}, i.id_incidencia DESC
    LIMIT ? OFFSET ?
  `;

  return db.prepare(sql).all(...valores, limite, desplazamiento);
}

/**
 * Cuenta cuantas incidencias cumplen los filtros, ignorando la paginacion.
 *
 * Se necesita para que el frontend pueda mostrar "mostrando 50 de 213" y
 * calcular cuantas paginas hay.
 */
export function contar(filtros = {}) {
  const { clausula, valores } = construirWhere(filtros);

  // Se repiten los JOIN porque los filtros podrian referirse a esas tablas.
  const sql = `
    SELECT COUNT(*) AS total
      FROM INCIDENCIA i
      INNER JOIN PROYECTO p  ON p.id_proyecto = i.id_proyecto
      INNER JOIN USUARIO  ur ON ur.id_usuario = i.reportado_por
      LEFT  JOIN USUARIO  ua ON ua.id_usuario = i.asignado_a
      ${clausula}
  `;

  const { total } = db.prepare(sql).get(...valores);
  return total;
}

/**
 * Busca una incidencia por su identificador.
 * @returns {object|undefined} La fila, o undefined si no existe.
 */
export function obtenerPorId(id) {
  return db.prepare(`${SELECT_BASE} WHERE i.id_incidencia = ?`).get(id);
}

/**
 * Version liviana de obtenerPorId, sin las uniones.
 *
 * Se usa cuando solo hace falta saber el estado actual o comprobar existencia,
 * por ejemplo antes de una transicion de estado. Evita el costo de tres JOIN
 * para leer una sola columna.
 */
export function obtenerCrudo(id) {
  return db.prepare('SELECT * FROM INCIDENCIA WHERE id_incidencia = ?').get(id);
}

// ---------------------------------------------------------------------------
// Operaciones de escritura
// ---------------------------------------------------------------------------

/**
 * Inserta una incidencia y devuelve la fila recien creada.
 *
 * Se asume que el service ya valido los datos y aplico los valores por
 * defecto. Aqui solo se escribe.
 *
 * `fecha_creacion` no se indica: la define el DEFAULT del esquema
 * (datetime('now')), de modo que la hora la pone siempre la base de datos y
 * no el reloj del proceso de Node.
 */
export function crear(datos) {
  const sql = `
    INSERT INTO INCIDENCIA (
        titulo, descripcion, prioridad, estado, categoria,
        clasificacion_automatica, posible_duplicado_de,
        id_proyecto, reportado_por, asignado_a
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const resultado = db
    .prepare(sql)
    .run(
      datos.titulo,
      datos.descripcion,
      datos.prioridad,
      datos.estado,
      datos.categoria,
      datos.clasificacion_automatica,
      datos.posible_duplicado_de,
      datos.id_proyecto,
      datos.reportado_por,
      datos.asignado_a
    );

  // lastInsertRowid puede llegar como BigInt; Number() lo normaliza para que
  // el resto del sistema (y JSON.stringify) lo trate como un numero corriente.
  return obtenerPorId(Number(resultado.lastInsertRowid));
}

/**
 * Modifica solo las columnas presentes en `cambios` (actualizacion parcial).
 *
 * Se recorre CAMPOS_ACTUALIZABLES y no las claves de `cambios`, para que un
 * cliente no pueda tocar columnas que no le corresponden enviando campos
 * inventados en el cuerpo de la peticion.
 *
 * @returns {object|undefined} La fila actualizada, o undefined si no existia.
 */
export function actualizar(id, cambios = {}) {
  const asignaciones = [];
  const valores = [];

  for (const campo of CAMPOS_ACTUALIZABLES) {
    // Object.hasOwn distingue "no vino el campo" de "vino con valor null".
    // Enviar null es legitimo: asi se desasigna un responsable.
    if (!Object.hasOwn(cambios, campo)) continue;

    asignaciones.push(`${campo} = ?`);
    valores.push(cambios[campo]);
  }

  // Sin campos que cambiar no se ejecuta ningun UPDATE: se devuelve el estado
  // actual tal cual esta.
  if (asignaciones.length === 0) {
    return obtenerPorId(id);
  }

  const sql = `UPDATE INCIDENCIA SET ${asignaciones.join(', ')} WHERE id_incidencia = ?`;
  const resultado = db.prepare(sql).run(...valores, id);

  if (resultado.changes === 0) return undefined;

  return obtenerPorId(id);
}

/**
 * Elimina una incidencia.
 * @returns {boolean} true si borro una fila, false si el id no existia.
 */
export function eliminar(id) {
  const resultado = db.prepare('DELETE FROM INCIDENCIA WHERE id_incidencia = ?').run(id);
  return resultado.changes > 0;
}

/**
 * Devuelve los textos de las incidencias contra las que se busca un duplicado.
 *
 * Se acotan de dos maneras, y ambas tienen motivo:
 *
 *   Mismo proyecto. Dos equipos distintos pueden reportar "la pantalla se
 *   queda en blanco" sobre sistemas que no tienen nada que ver. Comparar entre
 *   proyectos produciria coincidencias que no son duplicados.
 *
 *   No cerradas. Una incidencia CERRADA ya termino su ciclo; si el problema
 *   volvio a ocurrir, corresponde una incidencia nueva y no una marca de
 *   duplicado sobre algo que ya se dio por concluido. Se incluyen en cambio
 *   ABIERTA, EN_PROGRESO y RESUELTA: reportar de nuevo algo que otra persona
 *   ya esta arreglando, o que se resolvio pero aun no se cierra, es justamente
 *   el caso que este detector debe atrapar.
 *
 * Solo se traen las tres columnas necesarias para el calculo: el detector
 * compara textos, no necesita el resto de la fila.
 */
export function listarCandidatosDuplicado(idProyecto) {
  return db
    .prepare(
      `SELECT id_incidencia, titulo, descripcion
         FROM INCIDENCIA
        WHERE id_proyecto = ?
          AND estado <> 'CERRADA'
        ORDER BY id_incidencia`
    )
    .all(idProyecto);
}

/**
 * Indica si un id corresponde a una incidencia existente.
 * Se usa para validar el campo posible_duplicado_de.
 */
export function existe(id) {
  const fila = db.prepare('SELECT 1 AS existe FROM INCIDENCIA WHERE id_incidencia = ?').get(id);
  return fila !== undefined;
}
