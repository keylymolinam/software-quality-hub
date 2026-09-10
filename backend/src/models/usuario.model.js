/**
 * Model de USUARIO.
 *
 * Capa de persistencia de la tabla USUARIO. Mismo patron que los otros models,
 * con una regla adicional que no tienen las demas entidades:
 *
 *   LA COLUMNA contrasena_hash NO SALE DE ESTE ARCHIVO.
 *
 * Todas las consultas nombran las columnas una por una en lugar de usar
 * SELECT *, precisamente para que el hash no viaje por accidente. Un SELECT *
 * escrito con prisa lo incluiria, y desde ahi llegaria al service, al
 * controlador y finalmente al JSON que se envia al navegador, sin que nadie lo
 * note hasta que sea tarde.
 *
 * La unica excepcion es obtenerParaLogin(), que existe justamente para
 * comparar la contrasena. Su nombre lo declara: si aparece usada en cualquier
 * otro lugar que no sea el inicio de sesion, algo esta mal.
 */
import { db } from '../db/database.js';

// ---------------------------------------------------------------------------
// Listas blancas
// ---------------------------------------------------------------------------

const FILTROS_PERMITIDOS = {
  rol: 'u.rol = ?',
};

const CAMPOS_ACTUALIZABLES = ['nombre', 'correo_electronico', 'rol', 'contrasena_hash'];

const ORDENES_PERMITIDOS = {
  nombre: 'u.nombre',
  rol: 'u.rol',
  fecha_creacion: 'u.fecha_creacion',
};

/**
 * Columnas publicas. Esta constante es la que garantiza que el hash no se
 * filtre: al estar escrita una sola vez y reutilizarse en todas las consultas,
 * no hay forma de olvidarse de excluirlo en alguna.
 */
const COLUMNAS_PUBLICAS = `
      u.id_usuario,
      u.nombre,
      u.correo_electronico,
      u.rol,
      u.fecha_creacion
`;

const SELECT_BASE = `SELECT ${COLUMNAS_PUBLICAS} FROM USUARIO u`;

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
    condiciones.push('(u.nombre LIKE ? OR u.correo_electronico LIKE ?)');
    valores.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
  }

  const clausula = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  return { clausula, valores };
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/** Devuelve los usuarios que cumplen los filtros, ya paginados. */
export function listar(filtros = {}) {
  const { clausula, valores } = construirWhere(filtros);

  const columnaOrden = ORDENES_PERMITIDOS[filtros.ordenarPor] ?? ORDENES_PERMITIDOS.nombre;
  const direccion = String(filtros.direccion).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const limite = Number.isInteger(filtros.limite) ? filtros.limite : 50;
  const desplazamiento = Number.isInteger(filtros.desplazamiento) ? filtros.desplazamiento : 0;

  const sql = `
    ${SELECT_BASE}
    ${clausula}
    ORDER BY ${columnaOrden} ${direccion}, u.id_usuario ASC
    LIMIT ? OFFSET ?
  `;

  return db.prepare(sql).all(...valores, limite, desplazamiento);
}

/** Cuenta los usuarios que cumplen los filtros, ignorando la paginacion. */
export function contar(filtros = {}) {
  const { clausula, valores } = construirWhere(filtros);
  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM USUARIO u ${clausula}`)
    .get(...valores);

  return total;
}

/** Devuelve un usuario sin datos sensibles, o undefined si no existe. */
export function obtenerPorId(id) {
  return db.prepare(`${SELECT_BASE} WHERE u.id_usuario = ?`).get(id);
}

/**
 * Busca por correo, sin traer el hash.
 * Se usa para comprobar que el correo no este repetido antes de crear o editar.
 */
export function obtenerPorCorreo(correo) {
  return db.prepare(`${SELECT_BASE} WHERE u.correo_electronico = ?`).get(correo);
}

/**
 * UNICA consulta que devuelve contrasena_hash.
 *
 * Existe solo para el inicio de sesion: bcrypt necesita el hash guardado para
 * compararlo con la contrasena que escribio la persona. El resultado de esta
 * funcion NUNCA debe devolverse en una respuesta HTTP; auth.service.js lo usa
 * y descarta el hash inmediatamente.
 */
export function obtenerParaLogin(correo) {
  return db
    .prepare(
      `SELECT id_usuario, nombre, correo_electronico, rol, fecha_creacion, contrasena_hash
         FROM USUARIO
        WHERE correo_electronico = ?`
    )
    .get(correo);
}

/** Indica si existe un usuario con ese identificador. */
export function existe(id) {
  return db.prepare('SELECT 1 FROM USUARIO WHERE id_usuario = ?').get(id) !== undefined;
}

/**
 * Cuenta las incidencias que dependen de este usuario.
 *
 * Se consultan las tres relaciones por separado porque tienen consecuencias
 * distintas al eliminar (ver schema.sql):
 *   reportado_por  -> RESTRICT: impide el borrado.
 *   modificado_por -> RESTRICT: impide el borrado.
 *   asignado_a     -> SET NULL: no impide nada, la incidencia queda sin asignar.
 */
export function contarDependencias(id) {
  const reportadas = db
    .prepare('SELECT COUNT(*) AS total FROM INCIDENCIA WHERE reportado_por = ?')
    .get(id).total;

  const cambiosHistorial = db
    .prepare('SELECT COUNT(*) AS total FROM HISTORIAL_INCIDENCIA WHERE modificado_por = ?')
    .get(id).total;

  const asignadas = db
    .prepare('SELECT COUNT(*) AS total FROM INCIDENCIA WHERE asignado_a = ?')
    .get(id).total;

  return { reportadas, cambiosHistorial, asignadas };
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/**
 * Inserta un usuario y devuelve la fila creada, SIN el hash.
 * El service entrega `contrasena_hash` ya calculado: cifrar no es tarea de
 * la capa de persistencia.
 */
export function crear(datos) {
  const resultado = db
    .prepare(
      `INSERT INTO USUARIO (nombre, correo_electronico, contrasena_hash, rol)
       VALUES (?, ?, ?, ?)`
    )
    .run(datos.nombre, datos.correo_electronico, datos.contrasena_hash, datos.rol);

  return obtenerPorId(Number(resultado.lastInsertRowid));
}

/**
 * Modifica solo las columnas presentes en `cambios`.
 *
 * `contrasena_hash` esta en CAMPOS_ACTUALIZABLES porque cambiar la contrasena
 * es una operacion legitima, pero el service solo lo incluye despues de haber
 * verificado la contrasena actual.
 *
 * @returns {object|undefined} La fila actualizada sin el hash, o undefined.
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

  const sql = `UPDATE USUARIO SET ${asignaciones.join(', ')} WHERE id_usuario = ?`;
  const resultado = db.prepare(sql).run(...valores, id);

  if (resultado.changes === 0) return undefined;

  return obtenerPorId(id);
}

/**
 * Elimina un usuario.
 *
 * Falla si tiene incidencias reportadas o cambios en el historial: ambas claves
 * foraneas estan declaradas ON DELETE RESTRICT. El service comprueba esas
 * dependencias antes para poder explicar el motivo.
 *
 * @returns {boolean} true si borro una fila, false si el id no existia.
 */
export function eliminar(id) {
  return db.prepare('DELETE FROM USUARIO WHERE id_usuario = ?').run(id).changes > 0;
}
