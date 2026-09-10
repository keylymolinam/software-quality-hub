/**
 * Motor de clasificacion automatica.
 *
 * Primer diferenciador del proyecto. Deduce la CATEGORIA y la PRIORIDAD de una
 * incidencia a partir de su texto, aplicando reglas lexicas: busca terminos
 * conocidos, suma sus pesos y se queda con la categoria mas puntuada.
 *
 * Por que reglas y no aprendizaje automatico. Un clasificador entrenado
 * necesita cientos de incidencias ya etiquetadas para aprender, y este sistema
 * parte sin ninguna. Ademas, y sobre todo, un modelo entrenado no puede
 * explicar por que decidio lo que decidio. Aqui cada resultado viene con la
 * lista exacta de terminos que lo produjeron, de modo que si se equivoca se ve
 * de inmediato cual palabra lo confundio y se corrige editando el lexico.
 *
 * Que hace y que no hace:
 *   - Rellena categoria y prioridad SOLO cuando quien reporta no las indico.
 *     Una persona que eligio la categoria sabe mas que este archivo.
 *   - Nunca sobreescribe una eleccion humana.
 *   - Deja constancia: clasificacion_automatica = 1 marca las incidencias
 *     clasificadas por el motor, para poder medir despues cuantas veces
 *     acerto y cuantas hubo que corregir a mano.
 */
import { normalizar } from '../utils/similitud.js';
import {
  LEXICO_CATEGORIA,
  LEXICO_PETICION,
  LEXICO_DEFECTO,
  SENALES_PRIORIDAD,
  PRIORIDAD_BASE,
  ORDEN_DESEMPATE,
} from '../utils/lexico.js';

const CATEGORIA_POR_DEFECTO = 'OTRO';

/**
 * Puntaje minimo para aceptar una categoria.
 *
 * Con menos que esto, la evidencia es una sola palabra debil ("archivo",
 * "pantalla"), que aparece en incidencias de cualquier tipo. Preferir OTRO
 * antes que adivinar: una incidencia sin clasificar se nota y alguien la
 * corrige; una mal clasificada se queda escondida en la categoria equivocada.
 */
const PUNTAJE_MINIMO = 3;

/** Diferencia de puntaje entre ALTA y BAJA necesaria para mover la prioridad. */
const MARGEN_PRIORIDAD = 3;

const ESCALA_PRIORIDAD = ['BAJA', 'MEDIA', 'ALTA'];

// ---------------------------------------------------------------------------
// Busqueda de terminos
// ---------------------------------------------------------------------------

/**
 * Prepara el texto para comparar contra el lexico.
 *
 * Se reutiliza normalizar() del modulo de similitud (minusculas, sin acentos)
 * y ademas se convierte la enie en n. Esa diferencia es intencional: alli la
 * enie se conserva porque es una letra distinta y confundir "ano" con "año"
 * seria grave; aqui el texto solo se usa para buscar terminos del lexico, que
 * estan escritos sin enie, y mantenerla obligaria a duplicar cada entrada.
 *
 * Todo lo que no sea letra o numero pasa a ser un espacio, de modo que la
 * puntuacion no impida reconocer una palabra ("error 500." -> "error 500 ").
 */
function prepararTexto(titulo, descripcion) {
  return ` ${normalizar(`${titulo ?? ''} ${descripcion ?? ''}`)
    .replaceAll('ñ', 'n')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

/** Escapa los caracteres que tienen significado especial en una expresion regular. */
function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Indica si un termino del lexico aparece en el texto.
 *
 * Se exige que el termino este delimitado por espacios, para que "menor" no
 * coincida dentro de "menores" salvo que se pida explicitamente con asterisco.
 * Sin esa precaucion, "error" coincidiria dentro de "anterior".
 */
function contiene(texto, termino) {
  if (termino.endsWith('*')) {
    // 'demor*' -> cualquier palabra que empiece por "demor"
    const raiz = escapar(termino.slice(0, -1));
    return new RegExp(`\\s${raiz}[a-z0-9]*\\s`).test(texto);
  }

  return new RegExp(`\\s${escapar(termino)}\\s`).test(texto);
}

/**
 * Suma los pesos de los terminos de una lista que aparecen en el texto.
 * @returns {{ puntaje: number, encontrados: string[] }}
 */
function puntuar(texto, listaTerminos) {
  let puntaje = 0;
  const encontrados = [];

  for (const [termino, peso] of listaTerminos) {
    if (contiene(texto, termino)) {
      puntaje += peso;
      encontrados.push(termino);
    }
  }

  return { puntaje, encontrados };
}

// ---------------------------------------------------------------------------
// Clasificacion
// ---------------------------------------------------------------------------

/**
 * Determina la categoria de un texto ya preparado.
 *
 * @returns {{ categoria, puntaje, evidencia, puntajes, esPeticion }}
 */
function clasificarCategoria(texto) {
  const puntajes = {};
  const evidencias = {};

  for (const [categoria, terminos] of Object.entries(LEXICO_CATEGORIA)) {
    const { puntaje, encontrados } = puntuar(texto, terminos);
    puntajes[categoria] = puntaje;
    evidencias[categoria] = encontrados;
  }

  // Peticion de cambio, no falla. Se resuelve antes que cualquier otra cosa:
  // "cambiar el color del logotipo" tiene vocabulario de interfaz, pero no es
  // un defecto de interfaz. Solo se aplica si NO hay senales de falla, para no
  // desviar un error real que venga redactado como solicitud.
  const peticion = puntuar(texto, LEXICO_PETICION);
  const defecto = puntuar(texto, LEXICO_DEFECTO);

  const totalCategorias = Object.values(puntajes).reduce((a, b) => a + b, 0);

  if (peticion.puntaje >= PUNTAJE_MINIMO && peticion.puntaje > defecto.puntaje) {
    return {
      categoria: CATEGORIA_POR_DEFECTO,
      puntaje: peticion.puntaje,
      // La evidencia de que es una peticion compite con la de las categorias:
      // "cambio de" apunta a interfaz y "solicita" apunta a peticion. El total
      // debe incluir ambas, o la confianza podria pasar de 1.
      totalEvidencia: peticion.puntaje + totalCategorias,
      evidencia: peticion.encontrados,
      puntajes,
      esPeticion: true,
    };
  }

  const maximo = Math.max(...Object.values(puntajes));

  if (maximo < PUNTAJE_MINIMO) {
    return {
      categoria: CATEGORIA_POR_DEFECTO,
      puntaje: maximo,
      totalEvidencia: totalCategorias,
      evidencia: [],
      puntajes,
      esPeticion: false,
    };
  }

  // Puede haber empate. ORDEN_DESEMPATE decide, y no es un orden arbitrario:
  // va de la categoria mas critica a la menos, porque esconder un problema de
  // seguridad cuesta mas que revisar de mas uno de interfaz.
  const empatadas = Object.keys(puntajes).filter((c) => puntajes[c] === maximo);
  const categoria =
    empatadas.length === 1
      ? empatadas[0]
      : ORDEN_DESEMPATE.find((c) => empatadas.includes(c)) ?? empatadas[0];

  return {
    categoria,
    puntaje: maximo,
    totalEvidencia: totalCategorias,
    evidencia: evidencias[categoria],
    puntajes,
    esPeticion: false,
  };
}

/**
 * Determina la prioridad a partir de la categoria y de las senales del texto.
 *
 * Se parte de la prioridad tipica de la categoria y se sube o baja segun lo
 * que diga el texto. Un problema de interfaz empieza siendo BAJA, pero si
 * afecta a todos los clientes y se califica de urgente, sube.
 *
 * Solo se mueve un escalon por vez, y solo si la diferencia entre las senales
 * supera un margen. Asi una sola palabra suelta no altera el resultado: hace
 * falta que el texto insista.
 */
function clasificarPrioridad(texto, categoria) {
  const base = PRIORIDAD_BASE[categoria] ?? 'MEDIA';

  const alta = puntuar(texto, SENALES_PRIORIDAD.ALTA);
  const baja = puntuar(texto, SENALES_PRIORIDAD.BAJA);

  const diferencia = alta.puntaje - baja.puntaje;
  let indice = ESCALA_PRIORIDAD.indexOf(base);

  if (diferencia >= MARGEN_PRIORIDAD) indice += 1;
  else if (diferencia <= -MARGEN_PRIORIDAD) indice -= 1;

  // Se acota al rango valido: no hay nada por encima de ALTA ni bajo BAJA.
  indice = Math.min(ESCALA_PRIORIDAD.length - 1, Math.max(0, indice));

  return {
    prioridad: ESCALA_PRIORIDAD[indice],
    base,
    senalesAlta: alta.encontrados,
    senalesBaja: baja.encontrados,
    diferencia,
  };
}

/**
 * Clasifica una incidencia a partir de su texto.
 *
 * Es una funcion pura: no consulta la base de datos ni escribe nada. Recibe
 * texto y devuelve una propuesta con su justificacion.
 *
 * @param {object} datos
 * @param {string} datos.titulo
 * @param {string} datos.descripcion
 *
 * @returns {object}
 *   categoria     La categoria deducida, u OTRO.
 *   prioridad     ALTA, MEDIA o BAJA.
 *   confianza     Entre 0 y 1: que parte de toda la evidencia encontrada
 *                 apunta a la categoria elegida. Un valor bajo significa que
 *                 el texto tenia senales repartidas entre varias categorias.
 *   evidencia     Que se encontro y que se descarto, para poder explicarlo.
 */
export function clasificar(datos = {}) {
  const texto = prepararTexto(datos.titulo, datos.descripcion);

  const cat = clasificarCategoria(texto);
  const pri = clasificarPrioridad(texto, cat.categoria);

  // La confianza compara la evidencia que sostiene la decision contra TODA la
  // evidencia encontrada. Si el texto apuntaba solo a una categoria se acerca
  // a 1; si estaba repartido entre varias, baja. No es una probabilidad: es
  // una medida de cuan disputada estuvo la decision.
  //
  // Queda entre 0 y 1 por construccion, porque el numerador es siempre una
  // parte del denominador.
  const confianza = cat.totalEvidencia > 0 ? cat.puntaje / cat.totalEvidencia : 0;

  return {
    categoria: cat.categoria,
    prioridad: pri.prioridad,
    confianza: Number(confianza.toFixed(2)),
    evidencia: {
      terminos_categoria: cat.evidencia,
      es_peticion: cat.esPeticion,
      puntajes: cat.puntajes,
      prioridad_base: pri.base,
      senales_alta: pri.senalesAlta,
      senales_baja: pri.senalesBaja,
    },
  };
}
