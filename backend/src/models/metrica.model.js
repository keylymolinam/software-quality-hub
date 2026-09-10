/**
 * Model de METRICA y consultas de indicadores.
 *
 * Dos responsabilidades distintas conviven aqui:
 *
 *   1. Las consultas que CALCULAN los indicadores a partir de INCIDENCIA e
 *      HISTORIAL_INCIDENCIA. No leen la tabla METRICA: la recorren en vivo.
 *
 *   2. La lectura y escritura de la tabla METRICA, que guarda fotografias de
 *      esos indicadores en un momento dado.
 *
 * Por que ambas cosas y no solo una: calcular en vivo siempre da el valor
 * actual, pero no permite responder "como estabamos hace un mes". Guardar
 * fotografias periodicas es lo que convierte un numero en una tendencia, que
 * es lo que de verdad sirve para hablar de deuda tecnica.
 *
 * Todas las consultas aceptan un id_proyecto opcional. Cuando es null, el
 * calculo abarca el sistema completo. Se resuelve con el mismo SQL en ambos
 * casos usando la condicion `(? IS NULL OR i.id_proyecto = ?)`, para no
 * mantener dos versiones de cada consulta que podrian quedar desincronizadas.
 */
import { db } from '../db/database.js';

/** Estados que representan trabajo pendiente. CERRADA queda fuera. */
const ESTADOS_ABIERTOS = "('ABIERTA', 'EN_PROGRESO', 'RESUELTA')";

// ---------------------------------------------------------------------------
// Componente 1: antiguedad de las incidencias abiertas (deuda tecnica)
// ---------------------------------------------------------------------------

/**
 * Antiguedad de las incidencias que siguen sin cerrarse.
 *
 * julianday() convierte una fecha a un numero de dias, de modo que restar dos
 * fechas da la diferencia en dias directamente. Es la forma que ofrece SQLite
 * para hacer aritmetica con fechas guardadas como texto.
 *
 * Se devuelven promedio y maximo porque cuentan cosas distintas: el promedio
 * describe el estado general, y el maximo delata la incidencia mas olvidada,
 * que suele ser la que de verdad preocupa. Un proyecto con veinte incidencias
 * de tres dias y una de dos anos tiene un promedio tranquilizador y un
 * problema real.
 *
 * @returns {{ abiertas, antiguedad_promedio, antiguedad_maxima }}
 */
export function antiguedadAbiertas(idProyecto = null) {
  return db
    .prepare(
      `SELECT
          COUNT(*) AS abiertas,
          COALESCE(AVG(julianday('now') - julianday(i.fecha_creacion)), 0) AS antiguedad_promedio,
          COALESCE(MAX(julianday('now') - julianday(i.fecha_creacion)), 0) AS antiguedad_maxima
        FROM INCIDENCIA i
       WHERE i.estado IN ${ESTADOS_ABIERTOS}
         AND (? IS NULL OR i.id_proyecto = ?)`
    )
    .get(idProyecto, idProyecto);
}

// ---------------------------------------------------------------------------
// Componente 2: tasa de reapertura
// ---------------------------------------------------------------------------

/**
 * Incidencias que volvieron a EN_PROGRESO despues de haber sido resueltas.
 *
 * Es la consulta de referencia del Cap. IV.5 (docs/modelo-datos.md), separada
 * en sus dos partes para poder informar el numerador y el denominador ademas
 * del cociente: "1 de 4" explica mucho mejor que "0.25".
 *
 * COUNT(DISTINCT) evita contar dos veces una incidencia reabierta en mas de
 * una ocasion: lo que se mide es cuantas incidencias se reabrieron, no cuantas
 * reaperturas hubo.
 *
 * El denominador son TODAS las incidencias, cerradas incluidas. Una reapertura
 * es un defecto del proceso de resolucion, y el universo de resoluciones
 * posibles incluye lo ya terminado.
 *
 * @returns {{ reabiertas, total, tasa }}
 */
export function tasaReapertura(idProyecto = null) {
  const { reabiertas } = db
    .prepare(
      `SELECT COUNT(DISTINCT h.id_incidencia) AS reabiertas
         FROM HISTORIAL_INCIDENCIA h
         INNER JOIN INCIDENCIA i ON i.id_incidencia = h.id_incidencia
        WHERE h.estado_anterior = 'RESUELTA'
          AND h.estado_nuevo    = 'EN_PROGRESO'
          AND (? IS NULL OR i.id_proyecto = ?)`
    )
    .get(idProyecto, idProyecto);

  const { total } = db
    .prepare(
      `SELECT COUNT(*) AS total
         FROM INCIDENCIA i
        WHERE (? IS NULL OR i.id_proyecto = ?)`
    )
    .get(idProyecto, idProyecto);

  return {
    reabiertas,
    total,
    tasa: total > 0 ? reabiertas / total : 0,
  };
}

// ---------------------------------------------------------------------------
// Componente 3: densidad por categoria
// ---------------------------------------------------------------------------

/**
 * Reparto de las incidencias abiertas entre las categorias.
 *
 * Solo se cuentan las abiertas: lo que ya se cerro describe el pasado, y la
 * densidad busca describir donde esta hoy el trabajo acumulado.
 *
 * Se devuelve el detalle completo, no un unico numero, porque el dashboard
 * necesita mostrar el reparto y porque el indice se calcula despues a partir
 * de el.
 *
 * @returns {Array<{ categoria, cantidad }>} Ordenado de mayor a menor.
 */
export function densidadPorCategoria(idProyecto = null) {
  return db
    .prepare(
      `SELECT i.categoria, COUNT(*) AS cantidad
         FROM INCIDENCIA i
        WHERE i.estado IN ${ESTADOS_ABIERTOS}
          AND (? IS NULL OR i.id_proyecto = ?)
        GROUP BY i.categoria
        ORDER BY cantidad DESC, i.categoria ASC`
    )
    .all(idProyecto, idProyecto);
}

// ---------------------------------------------------------------------------
// Datos de apoyo
// ---------------------------------------------------------------------------

/** Reparto por estado, para el encabezado del dashboard. */
export function conteoPorEstado(idProyecto = null) {
  return db
    .prepare(
      `SELECT i.estado, COUNT(*) AS cantidad
         FROM INCIDENCIA i
        WHERE (? IS NULL OR i.id_proyecto = ?)
        GROUP BY i.estado`
    )
    .all(idProyecto, idProyecto);
}

/** Reparto por prioridad de lo que sigue abierto. */
export function conteoPorPrioridad(idProyecto = null) {
  return db
    .prepare(
      `SELECT i.prioridad, COUNT(*) AS cantidad
         FROM INCIDENCIA i
        WHERE i.estado IN ${ESTADOS_ABIERTOS}
          AND (? IS NULL OR i.id_proyecto = ?)
        GROUP BY i.prioridad`
    )
    .all(idProyecto, idProyecto);
}

/**
 * Tiempo medio de resolucion, en dias.
 *
 * Solo considera incidencias con fecha_resolucion. Eso deja fuera, sin
 * necesidad de condicion adicional, las cerradas por el atajo
 * ABIERTA -> CERRADA (duplicadas, descartadas), que nunca tuvieron resolucion
 * y falsearian el promedio hacia abajo.
 */
export function tiempoMedioResolucion(idProyecto = null) {
  const fila = db
    .prepare(
      `SELECT
          COUNT(*) AS resueltas,
          COALESCE(AVG(julianday(i.fecha_resolucion) - julianday(i.fecha_creacion)), 0) AS dias_promedio
        FROM INCIDENCIA i
       WHERE i.fecha_resolucion IS NOT NULL
         AND (? IS NULL OR i.id_proyecto = ?)`
    )
    .get(idProyecto, idProyecto);

  return fila;
}

/**
 * Cobertura del motor de clasificacion: que proporcion de las incidencias
 * fueron clasificadas automaticamente.
 */
export function coberturaClasificacion(idProyecto = null) {
  const fila = db
    .prepare(
      `SELECT
          COUNT(*) AS total,
          COALESCE(SUM(i.clasificacion_automatica), 0) AS automaticas
        FROM INCIDENCIA i
       WHERE (? IS NULL OR i.id_proyecto = ?)`
    )
    .get(idProyecto, idProyecto);

  return {
    ...fila,
    proporcion: fila.total > 0 ? fila.automaticas / fila.total : 0,
  };
}

/** Incidencias marcadas como posible duplicado. */
export function conteoDuplicados(idProyecto = null) {
  const { duplicados } = db
    .prepare(
      `SELECT COUNT(*) AS duplicados
         FROM INCIDENCIA i
        WHERE i.posible_duplicado_de IS NOT NULL
          AND (? IS NULL OR i.id_proyecto = ?)`
    )
    .get(idProyecto, idProyecto);

  return duplicados;
}

// ---------------------------------------------------------------------------
// Tabla METRICA: fotografias historicas
// ---------------------------------------------------------------------------

/**
 * Guarda el valor de una metrica en este momento.
 * id_proyecto null significa que la metrica es del sistema completo.
 */
export function guardar({ tipo_metrica, valor, id_proyecto = null }) {
  const resultado = db
    .prepare(
      `INSERT INTO METRICA (tipo_metrica, valor, id_proyecto)
       VALUES (?, ?, ?)`
    )
    .run(tipo_metrica, valor, id_proyecto);

  return db
    .prepare('SELECT * FROM METRICA WHERE id_metrica = ?')
    .get(Number(resultado.lastInsertRowid));
}

/**
 * Devuelve las fotografias guardadas, de la mas antigua a la mas reciente.
 *
 * El orden ascendente es el que necesita un grafico de evolucion: el tiempo
 * avanza hacia la derecha.
 *
 * CUIDADO CON EL SIGNIFICADO DE id_proyecto. En las consultas de calculo de
 * mas arriba, `null` quiere decir "todos los proyectos juntos". Aqui NO: en la
 * tabla METRICA, id_proyecto null identifica una fila concreta, la de la
 * metrica global. Son dos cosas distintas y confundirlas devuelve la serie
 * global mezclada con la de cada proyecto, que graficada da saltos sin
 * sentido.
 *
 * Por eso el ambito se pide de forma explicita:
 *
 *   ambito: 'GLOBAL'   solo las filas del sistema completo (id_proyecto IS NULL)
 *   ambito: <numero>   solo las de ese proyecto
 *   ambito: 'TODOS'    todas, para exportar o comparar
 *
 * La clausula se arma segun el ambito en lugar de usar un unico SQL con
 * condiciones neutralizadas. Los valores siguen viajando como parametros; lo
 * unico que cambia es la forma de la consulta, que no depende de datos del
 * usuario.
 */
export function historico({ tipo_metrica = null, ambito = 'GLOBAL', limite = 100 } = {}) {
  const condiciones = [];
  const valores = [];

  if (tipo_metrica) {
    condiciones.push('m.tipo_metrica = ?');
    valores.push(tipo_metrica);
  }

  if (ambito === 'GLOBAL') {
    condiciones.push('m.id_proyecto IS NULL');
  } else if (ambito !== 'TODOS') {
    condiciones.push('m.id_proyecto = ?');
    valores.push(ambito);
  }

  const clausula = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  return db
    .prepare(
      `SELECT m.id_metrica, m.tipo_metrica, m.valor, m.fecha_calculo, m.id_proyecto
         FROM METRICA m
         ${clausula}
        ORDER BY m.fecha_calculo ASC, m.id_metrica ASC
        LIMIT ?`
    )
    .all(...valores, limite);
}
