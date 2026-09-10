/**
 * Indice de salud / deuda tecnica.
 *
 * Tercer diferenciador del proyecto. Resume en un numero de 0 a 100 el estado
 * de un proyecto (o del sistema completo), combinando los tres componentes que
 * define la memoria:
 *
 *   1. Antiguedad de las incidencias abiertas   -> deuda que se acumula
 *   2. Tasa de reapertura                       -> calidad de las soluciones
 *   3. Densidad por categoria                   -> concentracion del problema
 *
 * 100 es el estado ideal y 0 el peor. Se orienta asi, y no al reves, porque un
 * indice de SALUD debe subir cuando las cosas mejoran: un numero que crece
 * mientras el proyecto empeora se malinterpreta a la primera.
 *
 * ---------------------------------------------------------------------------
 * SOBRE LOS PARAMETROS
 *
 * Los limites y los pesos de mas abajo son un JUICIO, no un resultado. No hay
 * forma de derivarlos de los datos: decir que una incidencia abierta hace
 * noventa dias es "lo peor" es una convencion, igual que decidir que la
 * reapertura pesa mas que la concentracion.
 *
 * Lo que si es objetivo es todo lo demas: cada componente se mide con una
 * consulta verificable, y el indice descompone su resultado en las partes que
 * lo formaron. Quien no comparta los pesos puede cambiarlos aqui y recalcular,
 * sin tocar nada mas.
 *
 * Esa distincion conviene declararla en la memoria: el aporte del trabajo es
 * la medicion y su trazabilidad, no la pretension de haber encontrado la
 * ponderacion correcta.
 */
import * as Metrica from '../models/metrica.model.js';
import * as Proyecto from '../models/proyecto.model.js';
import { errorNoEncontrado, errorSolicitud } from '../utils/errores.js';
import { exigirIdValido } from '../utils/validacion.js';

// ---------------------------------------------------------------------------
// Parametros
// ---------------------------------------------------------------------------

/**
 * Antiguedad promedio (en dias) a partir de la cual el componente vale 0.
 *
 * Noventa dias es un trimestre: una incidencia que lleva mas de eso sin
 * cerrarse dejo de ser un pendiente y paso a ser parte del paisaje.
 */
const LIMITE_ANTIGUEDAD_DIAS = 90;

/**
 * Tasa de reapertura a partir de la cual el componente vale 0.
 *
 * Un 30 % significa que casi una de cada tres incidencias dadas por resueltas
 * no lo estaba. A ese nivel el problema ya no son las incidencias sino el
 * proceso de validacion.
 */
const LIMITE_REAPERTURA = 0.30;

/** Cuanto pesa cada componente en el indice. Deben sumar 1. */
const PESOS = {
  antiguedad: 0.40,
  reapertura: 0.35,
  densidad: 0.25,
};

/**
 * Umbrales de la etiqueta legible que acompana al numero.
 *
 * Existen porque "72" no le dice nada a nadie sin referencia, y porque un
 * dashboard necesita decidir de que color pintar la tarjeta.
 */
const UMBRALES = {
  SALUDABLE: 80,
  ATENCION: 60,
  // por debajo de ATENCION: CRITICO
};

/** Numero de categorias posibles. Se usa para normalizar la concentracion. */
const TOTAL_CATEGORIAS = 6;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Redondea a un decimal, que es toda la precision que este indice justifica. */
const redondear = (n) => Number(n.toFixed(1));

/**
 * Convierte una medida "mientras mas alta peor" en un puntaje de 0 a 100
 * "mientras mas alto mejor".
 *
 * La relacion es lineal y se corta en el limite: pasado ese punto el puntaje
 * es 0 y no sigue bajando. Sin ese corte, un unico valor extremo (una
 * incidencia de tres anos) hundiria el indice completo y taparia todo lo demas.
 */
function puntuarInverso(valor, limite) {
  if (limite <= 0) return 100;
  return 100 * (1 - Math.min(1, Math.max(0, valor) / limite));
}

/**
 * Mide que tan concentradas estan las incidencias abiertas en pocas categorias.
 *
 * Se usa el indice de Herfindahl-Hirschman: la suma de los cuadrados de las
 * proporciones. Elevar al cuadrado hace que una categoria que concentra mucho
 * pese desproporcionadamente, que es justo lo que se quiere detectar.
 *
 *   Todo en una sola categoria      -> HHI = 1
 *   Repartido entre las seis        -> HHI = 1/6
 *
 * El resultado se lleva a una escala de 0 a 1 restandole ese minimo, para que
 * "perfectamente repartido" valga 0 y no 0.167.
 *
 * Que mide en realidad: un proyecto con incidencias repartidas entre varias
 * categorias tiene el desgaste normal de cualquier sistema en uso. Uno donde
 * casi todo cae en la misma categoria tiene un problema estructural ahi, y ese
 * es el que conviene atacar de raiz.
 *
 * INTERPRETACION ELEGIDA: la memoria nombra el componente como "densidad por
 * categoria" sin definirlo. Se interpreto como concentracion. La alternativa
 * seria entenderlo como cantidad de incidencias por categoria, pero eso ya lo
 * mide el componente de antiguedad (a mas incidencias abiertas, mas deuda) y
 * el indice quedaria contando dos veces lo mismo.
 *
 * @returns {{ concentracion, puntaje, categorias_con_carga }}
 */
function medirConcentracion(densidad) {
  const total = densidad.reduce((suma, d) => suma + d.cantidad, 0);

  // Sin incidencias abiertas no hay nada concentrado. Se devuelve el mejor
  // puntaje, pero el llamador decide si eso significa "sano" o "sin datos".
  if (total === 0) {
    return { concentracion: 0, puntaje: 100, categorias_con_carga: 0 };
  }

  const hhi = densidad.reduce((suma, d) => suma + (d.cantidad / total) ** 2, 0);

  const minimo = 1 / TOTAL_CATEGORIAS;
  const normalizado = Math.max(0, (hhi - minimo) / (1 - minimo));

  return {
    concentracion: redondear(normalizado * 100) / 100,
    puntaje: 100 * (1 - normalizado),
    categorias_con_carga: densidad.length,
  };
}

/** Traduce el puntaje a una etiqueta legible. */
function etiquetar(indice) {
  if (indice >= UMBRALES.SALUDABLE) return 'SALUDABLE';
  if (indice >= UMBRALES.ATENCION) return 'ATENCION';
  return 'CRITICO';
}

// ---------------------------------------------------------------------------
// Calculo
// ---------------------------------------------------------------------------

/**
 * Calcula el indice de salud de un proyecto, o del sistema completo.
 *
 * @param {number|null} idProyecto null = todo el sistema.
 * @returns {object} El indice, su etiqueta, los tres componentes con el
 *                   detalle que los produjo, y datos de contexto.
 */
export function calcularSalud(idProyecto = null) {
  const antiguedad = Metrica.antiguedadAbiertas(idProyecto);
  const reapertura = Metrica.tasaReapertura(idProyecto);
  const densidad = Metrica.densidadPorCategoria(idProyecto);
  const concentracion = medirConcentracion(densidad);

  const puntajes = {
    antiguedad: puntuarInverso(antiguedad.antiguedad_promedio, LIMITE_ANTIGUEDAD_DIAS),
    reapertura: puntuarInverso(reapertura.tasa, LIMITE_REAPERTURA),
    densidad: concentracion.puntaje,
  };

  const indice =
    puntajes.antiguedad * PESOS.antiguedad +
    puntajes.reapertura * PESOS.reapertura +
    puntajes.densidad * PESOS.densidad;

  // Un proyecto sin incidencias no esta sano: esta sin medir. Las tres
  // componentes darian 100 por ausencia de datos, y pintar eso de verde seria
  // afirmar algo que nadie comprobo. Se informa el numero igual, pero
  // acompanado de la advertencia, para que el dashboard no lo muestre como un
  // logro.
  const datosSuficientes = reapertura.total > 0;

  return {
    ambito: idProyecto === null ? 'GLOBAL' : `PROYECTO_${idProyecto}`,
    id_proyecto: idProyecto,

    indice: redondear(indice),
    etiqueta: datosSuficientes ? etiquetar(indice) : 'SIN_DATOS',
    datos_suficientes: datosSuficientes,

    componentes: {
      antiguedad: {
        puntaje: redondear(puntajes.antiguedad),
        peso: PESOS.antiguedad,
        incidencias_abiertas: antiguedad.abiertas,
        antiguedad_promedio_dias: redondear(antiguedad.antiguedad_promedio),
        antiguedad_maxima_dias: redondear(antiguedad.antiguedad_maxima),
        limite_dias: LIMITE_ANTIGUEDAD_DIAS,
      },
      reapertura: {
        puntaje: redondear(puntajes.reapertura),
        peso: PESOS.reapertura,
        incidencias_reabiertas: reapertura.reabiertas,
        incidencias_totales: reapertura.total,
        tasa: redondear(reapertura.tasa * 100) / 100,
        limite: LIMITE_REAPERTURA,
      },
      densidad: {
        puntaje: redondear(puntajes.densidad),
        peso: PESOS.densidad,
        concentracion: concentracion.concentracion,
        categorias_con_carga: concentracion.categorias_con_carga,
        de_un_total_de: TOTAL_CATEGORIAS,
        reparto: densidad,
      },
    },

    // Datos que el dashboard necesita mostrar junto al indice, y que ayudan a
    // interpretarlo: un indice bajo con dos incidencias no es lo mismo que un
    // indice bajo con doscientas.
    contexto: {
      por_estado: Metrica.conteoPorEstado(idProyecto),
      por_prioridad_abiertas: Metrica.conteoPorPrioridad(idProyecto),
      tiempo_medio_resolucion_dias: redondear(
        Metrica.tiempoMedioResolucion(idProyecto).dias_promedio
      ),
      clasificacion_automatica: Metrica.coberturaClasificacion(idProyecto),
      posibles_duplicados: Metrica.conteoDuplicados(idProyecto),
    },
  };
}

/**
 * Indice de salud del sistema y de cada proyecto, en una sola respuesta.
 *
 * Es lo que necesita la pantalla principal del dashboard: el numero grande
 * arriba y el desglose por proyecto debajo, ordenado de peor a mejor para que
 * lo urgente quede primero.
 */
export function calcularSaludGeneral() {
  const proyectos = Proyecto.listar({ limite: 100 });

  const porProyecto = proyectos
    .map((p) => ({
      id_proyecto: p.id_proyecto,
      nombre: p.nombre,
      estado_proyecto: p.estado,
      ...calcularSalud(p.id_proyecto),
    }))
    // Peor primero. Los proyectos sin datos van al final: no son urgentes,
    // simplemente no hay nada que decir sobre ellos.
    .sort((a, b) => {
      if (a.datos_suficientes !== b.datos_suficientes) return a.datos_suficientes ? -1 : 1;
      return a.indice - b.indice;
    });

  return {
    global: calcularSalud(null),
    proyectos: porProyecto,
  };
}

/**
 * Indice de salud de un proyecto concreto.
 * @throws {ErrorHttp} 404 si el proyecto no existe.
 */
export function calcularSaludProyecto(id) {
  const idProyecto = exigirIdValido(id);

  if (!Proyecto.existe(idProyecto)) {
    throw errorNoEncontrado(`No existe el proyecto con id ${idProyecto}.`);
  }

  const proyecto = Proyecto.obtenerPorId(idProyecto);

  return {
    id_proyecto: idProyecto,
    nombre: proyecto.nombre,
    estado_proyecto: proyecto.estado,
    ...calcularSalud(idProyecto),
  };
}

// ---------------------------------------------------------------------------
// Fotografias historicas
// ---------------------------------------------------------------------------

/**
 * Nombres con los que se guardan las metricas en la tabla METRICA.
 *
 * Coinciden con los que ya usaba seed.sql, para que las fotografias de prueba
 * y las que genera el sistema formen una sola serie y no dos.
 *
 * El ambito NO se codifica en el nombre: una metrica es global cuando su
 * id_proyecto es NULL. Tener ademas un tipo distinto para lo global (el seed
 * traia 'INDICE_SALUD_GLOBAL') seria decir lo mismo dos veces, y bastaria que
 * una consulta filtrara por el tipo y otra por el id para obtener resultados
 * que no cuadran.
 */
export const TIPOS_METRICA = {
  INDICE_SALUD: 'INDICE_SALUD',
  TASA_REAPERTURA: 'TASA_REAPERTURA',
  ANTIGUEDAD_MEDIA_DIAS: 'ANTIGUEDAD_MEDIA_DIAS',
  CONCENTRACION_CATEGORIA: 'CONCENTRACION_CATEGORIA',
};

/**
 * Guarda en METRICA el estado actual del sistema y de cada proyecto.
 *
 * Se guardan los cuatro valores por separado, y no solo el indice, porque un
 * indice que baja no dice POR QUE bajo. Teniendo los componentes guardados se
 * puede reconstruir despues si la culpa fue la antiguedad o las reaperturas.
 *
 * Pensado para ejecutarse periodicamente. El valor de este diferenciador no
 * esta en el numero de hoy, sino en la tendencia: un indice de 70 estable es
 * una situacion distinta de un 70 que hace un mes era 90.
 *
 * @returns {{ registros, fecha_calculo }}
 */
export function registrarSnapshot() {
  const { global, proyectos } = calcularSaludGeneral();
  const guardados = [];

  const guardarAmbito = (salud, idProyecto) => {
    guardados.push(
      Metrica.guardar({
        tipo_metrica: TIPOS_METRICA.INDICE_SALUD,
        valor: salud.indice,
        id_proyecto: idProyecto,
      }),
      Metrica.guardar({
        tipo_metrica: TIPOS_METRICA.TASA_REAPERTURA,
        valor: salud.componentes.reapertura.tasa,
        id_proyecto: idProyecto,
      }),
      Metrica.guardar({
        tipo_metrica: TIPOS_METRICA.ANTIGUEDAD_MEDIA_DIAS,
        valor: salud.componentes.antiguedad.antiguedad_promedio_dias,
        id_proyecto: idProyecto,
      }),
      Metrica.guardar({
        tipo_metrica: TIPOS_METRICA.CONCENTRACION_CATEGORIA,
        valor: salud.componentes.densidad.concentracion,
        id_proyecto: idProyecto,
      })
    );
  };

  guardarAmbito(global, null);
  for (const p of proyectos) guardarAmbito(p, p.id_proyecto);

  return {
    registros: guardados.length,
    fecha_calculo: guardados[0]?.fecha_calculo ?? null,
  };
}

/**
 * Devuelve las fotografias guardadas, para graficar la evolucion.
 *
 * El ambito es explicito y por defecto GLOBAL: una serie de tiempo tiene que
 * ser de UNA cosa. Mezclar el indice del sistema con el de cada proyecto
 * produce un grafico que sube y baja sin que nada haya cambiado.
 *
 * @param {object} consulta
 * @param {string} [consulta.tipo_metrica] Por defecto INDICE_SALUD.
 * @param {string} [consulta.id_proyecto]  Un id, o 'TODOS'. Omitirlo = GLOBAL.
 */
export function obtenerHistorico(consulta = {}) {
  let ambito = 'GLOBAL';

  if (consulta.id_proyecto === 'TODOS') {
    ambito = 'TODOS';
  } else if (consulta.id_proyecto !== undefined && consulta.id_proyecto !== '') {
    ambito = exigirIdValido(consulta.id_proyecto);
  }

  const tipo = consulta.tipo_metrica ?? TIPOS_METRICA.INDICE_SALUD;

  if (!Object.values(TIPOS_METRICA).includes(tipo)) {
    throw errorSolicitud(
      `tipo_metrica debe ser uno de: ${Object.values(TIPOS_METRICA).join(', ')}.`
    );
  }

  const registros = Metrica.historico({ tipo_metrica: tipo, ambito, limite: 200 });

  return {
    ambito: ambito === 'GLOBAL' || ambito === 'TODOS' ? ambito : `PROYECTO_${ambito}`,
    tipo_metrica: tipo,
    total: registros.length,
    registros,
  };
}
