/**
 * Model de PROYECTO.
 *
 * Capa de persistencia: el unico lugar donde se escribe SQL sobre esta tabla.
 * No valida ni decide codigos HTTP; de eso se encarga proyecto.service.js.
 *
 * Mismo patron que incidencia.model.js: listas blancas para todo nombre de
 * columna que se concatene en la consulta, y parametros `?` para todo valor.
 */
import { db } from '../db/database.js';

// ---------------------------------------------------------------------------
// Listas blancas
// ---------------------------------------------------------------------------

const FILTROS_PERMITIDOS = {
  estado: 'p.estado = ?',
};

const CAMPOS_ACTUALIZABLES = ['nombre', 'descripcion', 'fecha_inicio', 'estado'];

const ORDENES_PERMITIDOS = {
  nombre: 'p.nombre',
  estado: 'p.estado',
  fecha_inicio: 'p.fecha_inicio',
  total_incidencias: 'total_incidencias',
};

// ---------------------------------------------------------------------------
// Consulta base
// ---------------------------------------------------------------------------

/**
 * Cada proyecto viaja con el recuento de sus incidencias.
 *
 * Se usan subconsultas y no un LEFT JOIN con GROUP BY por dos motivos: se leen
 * mucho mas facil, y un JOIN con dos condiciones distintas obligaria a contar
 * con CASE WHEN, que es justo el tipo de consulta que nadie entiende al volver
 * a leerla. El costo es despreciable porque existe idx_incidencia_proyecto.
 *
 * `pendientes` son las que siguen requiriendo trabajo (ABIERTA o EN_PROGRESO).
 * Es el dato que el listado de proyectos necesita mostrar: un proyecto con 200
 * incidencias cerradas esta sano; uno con 12 abiertas, no.
 */
const SELECT_BASE = `
  SELECT
      p.id_proyecto,
      p.nombre,
      p.descripcion,
      p.fecha_inicio,
      p.estado,
      (SELECT COUNT(*) FROM INCIDENCIA i
        WHERE i.id_proyecto = p.id_proyecto) AS total_incidencias,
      (SELECT COUNT(*) FROM INCIDENCIA i
        WHERE i.id_proyecto = p.id_proyecto
          AND i.estado IN ('ABIERTA', 'EN_PROGRESO')) AS incidencias_pendientes
    FROM PROYECTO p
`;

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

function construirWhere(filtros = {}) {
  const condiciones = [];
  const valores = [];

  for (const [campo, condicionSql] of Object.entries(FILTROS_PERMITIDOS)) {
    const valor = filtros[campo];
    if (valor === undefined || valor === null || valor === '') continue;

    condiciones.push(condicionSql);
    valores.push(valor);
  }

  if (filtros.busqueda) {
    condiciones.push('(p.nombre LIKE ? OR p.descripcion LIKE ?)');
    valores.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
  }

  const clausula = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  return { clausula, valores };
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/** Devuelve los proyectos que cumplen los filtros, ya paginados. */
export function listar(filtros = {}) {
  const { clausula, valores } = construirWhere(filtros);

  const columnaOrden = ORDENES_PERMITIDOS[filtros.ordenarPor] ?? ORDENES_PERMITIDOS.nombre;

  // El orden por defecto es ascendente, al reves que en incidencias. Un
  // listado de proyectos se lee como un indice alfabetico; uno de incidencias,
  // como un registro cronologico donde interesa lo mas reciente.
  const direccion = String(filtros.direccion).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const limite = Number.isInteger(filtros.limite) ? filtros.limite : 50;
  const desplazamiento = Number.isInteger(filtros.desplazamiento) ? filtros.desplazamiento : 0;

  const sql = `
    ${SELECT_BASE}
    ${clausula}
    ORDER BY ${columnaOrden} ${direccion}, p.id_proyecto ASC
    LIMIT ? OFFSET ?
  `;

  return db.prepare(sql).all(...valores, limite, desplazamiento);
}

/** Cuenta los proyectos que cumplen los filtros, ignorando la paginacion. */
export function contar(filtros = {}) {
  const { clausula, valores } = construirWhere(filtros);
  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM PROYECTO p ${clausula}`)
    .get(...valores);

  return total;
}

/** Devuelve un proyecto con sus recuentos, o undefined si no existe. */
export function obtenerPorId(id) {
  return db.prepare(`${SELECT_BASE} WHERE p.id_proyecto = ?`).get(id);
}

/** Version liviana, sin los recuentos. */
export function obtenerCrudo(id) {
  return db.prepare('SELECT * FROM PROYECTO WHERE id_proyecto = ?').get(id);
}

/** Indica si existe un proyecto con ese identificador. */
export function existe(id) {
  return db.prepare('SELECT 1 FROM PROYECTO WHERE id_proyecto = ?').get(id) !== undefined;
}

/**
 * Cuenta las incidencias asociadas a un proyecto.
 *
 * La usa el service antes de eliminar: la clave foranea esta declarada
 * ON DELETE RESTRICT, de modo que la base rechazaria el borrado con un error
 * tecnico. Preguntando primero se puede informar cuantas incidencias lo
 * impiden, que es lo que el usuario necesita saber.
 */
export function contarIncidencias(id) {
  const { total } = db
    .prepare('SELECT COUNT(*) AS total FROM INCIDENCIA WHERE id_proyecto = ?')
    .get(id);

  return total;
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/** Inserta un proyecto y devuelve la fila recien creada. */
export function crear(datos) {
  const resultado = db
    .prepare(
      `INSERT INTO PROYECTO (nombre, descripcion, fecha_inicio, estado)
       VALUES (?, ?, ?, ?)`
    )
    .run(datos.nombre, datos.descripcion, datos.fecha_inicio, datos.estado);

  return obtenerPorId(Number(resultado.lastInsertRowid));
}

/**
 * Modifica solo las columnas presentes en `cambios`.
 * @returns {object|undefined} La fila actualizada, o undefined si no existia.
 */
export function actualizar(id, cambios = {}) {
  const asignaciones = [];
  const valores = [];

  for (const campo of CAMPOS_ACTUALIZABLES) {
    if (!Object.hasOwn(cambios, campo)) continue;

    asignaciones.push(`${campo} = ?`);
    valores.push(cambios[campo]);
  }

  if (asignaciones.length === 0) {
    return obtenerPorId(id);
  }

  const sql = `UPDATE PROYECTO SET ${asignaciones.join(', ')} WHERE id_proyecto = ?`;
  const resultado = db.prepare(sql).run(...valores, id);

  if (resultado.changes === 0) return undefined;

  return obtenerPorId(id);
}

/**
 * Elimina un proyecto.
 *
 * Solo tiene exito si no tiene incidencias asociadas: la clave foranea de
 * INCIDENCIA esta declarada ON DELETE RESTRICT, asi que SQLite aborta el
 * borrado. El service comprueba esa condicion antes para poder dar un mensaje
 * util, pero la restriccion de la base sigue siendo la garantia final.
 *
 * @returns {boolean} true si borro una fila, false si el id no existia.
 */
export function eliminar(id) {
  return db.prepare('DELETE FROM PROYECTO WHERE id_proyecto = ?').run(id).changes > 0;
}
