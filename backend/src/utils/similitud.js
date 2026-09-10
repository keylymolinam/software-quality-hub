/**
 * Medicion de similitud entre textos.
 *
 * Funciones puras: reciben texto, devuelven numeros. No conocen la base de
 * datos, ni Express, ni el concepto de incidencia. Gracias a eso se pueden
 * probar y calibrar por separado, que es justo lo que hace falta para elegir
 * un umbral con criterio en vez de a ojo.
 *
 * Metodo elegido: coeficiente de JACCARD sobre conjuntos de palabras.
 *
 *                    palabras en comun
 *     similitud = -----------------------
 *                 total de palabras distintas
 *
 * Se prefiere a TF-IDF por dos razones. La primera es que se explica en una
 * linea y se puede verificar a mano contando palabras, cosa que importa en un
 * trabajo que hay que defender. La segunda es que TF-IDF necesita conocer TODO
 * el conjunto de documentos para calcular la frecuencia inversa, de modo que
 * el resultado de comparar dos incidencias cambiaria a medida que se agregan
 * otras; Jaccard compara dos textos y siempre da lo mismo.
 *
 * Su limitacion conocida: solo ve coincidencias exactas de palabras. "lento" y
 * "demora" describen lo mismo y para Jaccard no se parecen en nada. Las etapas
 * de normalizacion de mas abajo reducen el problema, pero no lo eliminan.
 */

/**
 * Palabras vacias del espanol.
 *
 * Son palabras que aparecen en casi cualquier texto (articulos, preposiciones,
 * conjunciones) y por lo tanto no distinguen una incidencia de otra. Si no se
 * quitaran, dos textos que no tienen nada que ver compartirian "el", "de",
 * "la", "que", y la similitud saldria inflada.
 *
 * Se conservan a proposito los adverbios de negacion ("no", "sin", "nunca"):
 * "el boton guarda" y "el boton no guarda" son incidencias distintas.
 */
const PALABRAS_VACIAS = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con',
  'cual', 'cuando', 'de', 'del', 'desde', 'donde', 'durante', 'e', 'el',
  'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'es', 'esa', 'ese', 'eso',
  'esta', 'estan', 'este', 'esto', 'estos', 'ha', 'hace', 'hacia', 'han',
  'hasta', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi',
  'mientras', 'muy', 'o', 'otra', 'otro', 'para', 'pero', 'por', 'porque',
  'que', 'se', 'segun', 'ser', 'si', 'sobre', 'son', 'su', 'sus', 'tambien',
  'te', 'tiene', 'todo', 'todos', 'tras', 'un', 'una', 'uno', 'unos', 'y',
  'ya', 'yo',
]);

/** Debajo de este largo, una palabra aporta mas ruido que informacion. */
const LARGO_MINIMO_PALABRA = 3;

/**
 * Quita los acentos y pasa a minusculas.
 *
 * normalize('NFD') separa cada letra acentuada en dos caracteres: la letra
 * base y la tilde. Borrando el segundo queda la letra sola. Asi "sesión" y
 * "sesion" se cuentan como la misma palabra, que es lo que ocurre en la
 * practica cuando la gente escribe con prisa.
 *
 * La enie se protege antes y se restituye despues: para el espanol es una
 * letra distinta, no una "n" con adorno, y confundir "ano" con "año" en un
 * sistema de incidencias seria un problema.
 */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .replaceAll('ñ', '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replaceAll('', 'ñ');
}

/**
 * Reduce plurales evidentes a su forma singular.
 *
 * "usuario" y "usuarios" describen lo mismo, pero para un conjunto de palabras
 * son elementos distintos y no se cuentan como coincidencia. Esta regla es
 * ortografica, no linguistica: no pretende conjugar bien el espanol, solo
 * aplicar la MISMA transformacion a ambos textos para que coincidan.
 *
 * Por eso da igual que produzca formas que no existen ("analisis" -> "analisi"):
 * mientras los dos lados se transformen igual, la comparacion sigue siendo
 * valida.
 *
 * Solo se aplica a palabras de mas de cuatro letras, para no destrozar
 * palabras cortas que terminan en s y no son plurales ("mas", "tres").
 */
function singularizar(palabra) {
  if (palabra.length <= 4 || !palabra.endsWith('s')) return palabra;

  // "errores" -> "error", "direcciones" -> "direccion"
  if (palabra.endsWith('es')) return palabra.slice(0, -2);

  // "usuarios" -> "usuario"
  return palabra.slice(0, -1);
}

/**
 * Convierte un texto en el conjunto de palabras que lo caracterizan.
 *
 * Etapas: normalizar -> separar -> descartar cortas y vacias -> singularizar.
 *
 * El resultado es un Set y no un arreglo: repetir "portal" cinco veces no hace
 * a un texto mas parecido a otro que lo menciona una vez. Lo que interesa es
 * QUE conceptos aparecen, no cuantas veces.
 *
 * @returns {Set<string>}
 */
export function extraerPalabras(texto) {
  const palabras = normalizar(texto)
    // Se separa por cualquier cosa que no sea letra o numero. Los numeros se
    // conservan porque suelen ser lo mas identificatorio de una incidencia:
    // "error 500", "pantalla 1280".
    .split(/[^a-z0-9ñ]+/)
    .filter((p) => p.length >= LARGO_MINIMO_PALABRA && !PALABRAS_VACIAS.has(p))
    .map(singularizar);

  return new Set(palabras);
}

/**
 * Coeficiente de Jaccard entre dos conjuntos.
 *
 *     |A ∩ B| / |A ∪ B|
 *
 * Vale 1 si los conjuntos son identicos y 0 si no comparten nada.
 *
 * Dos conjuntos vacios se consideran sin similitud (0) y no identicos (1):
 * dos incidencias sin una sola palabra util no son un duplicado, son un dato
 * insuficiente.
 */
export function jaccard(conjuntoA, conjuntoB) {
  if (conjuntoA.size === 0 || conjuntoB.size === 0) return 0;

  let comunes = 0;
  for (const elemento of conjuntoA) {
    if (conjuntoB.has(elemento)) comunes += 1;
  }

  const union = conjuntoA.size + conjuntoB.size - comunes;

  return comunes / union;
}

/**
 * Coeficiente de Dice (o Sorensen).
 *
 *     2·|A ∩ B| / (|A| + |B|)
 *
 * Mide lo mismo que Jaccard pero da mas peso a las coincidencias: cuenta la
 * interseccion dos veces, una por cada conjunto. Para un mismo par de textos
 * siempre entrega un valor mayor o igual que Jaccard.
 *
 * Se incluye porque la eleccion entre uno y otro cambia por completo que
 * umbral es razonable, y conviene poder comparar ambos con datos reales en vez
 * de elegir por costumbre.
 */
export function dice(conjuntoA, conjuntoB) {
  if (conjuntoA.size === 0 || conjuntoB.size === 0) return 0;

  let comunes = 0;
  for (const elemento of conjuntoA) {
    if (conjuntoB.has(elemento)) comunes += 1;
  }

  return (2 * comunes) / (conjuntoA.size + conjuntoB.size);
}

/**
 * Similitud entre dos textos, lista para usar.
 *
 * @param {string} textoA
 * @param {string} textoB
 * @param {string} metodo 'jaccard' (por defecto) o 'dice'.
 * @returns {number} Entre 0 y 1.
 */
export function similitud(textoA, textoB, metodo = 'jaccard') {
  const a = extraerPalabras(textoA);
  const b = extraerPalabras(textoB);

  return metodo === 'dice' ? dice(a, b) : jaccard(a, b);
}

/**
 * Detalle del calculo, para poder explicar un resultado.
 *
 * No se usa en la deteccion en si: existe para depurar y para calibrar el
 * umbral, donde hace falta ver QUE palabras se compartieron y cuales no.
 */
export function explicar(textoA, textoB) {
  const a = extraerPalabras(textoA);
  const b = extraerPalabras(textoB);

  const comunes = [...a].filter((p) => b.has(p));
  const soloA = [...a].filter((p) => !b.has(p));
  const soloB = [...b].filter((p) => !a.has(p));

  return {
    palabrasA: a.size,
    palabrasB: b.size,
    comunes,
    soloA,
    soloB,
    jaccard: jaccard(a, b),
    dice: dice(a, b),
  };
}
