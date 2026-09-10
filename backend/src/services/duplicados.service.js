/**
 * Detector de incidencias duplicadas.
 *
 * Segundo diferenciador del proyecto. Cuando alguien registra una incidencia,
 * este modulo revisa si ya existe otra que describa lo mismo y, de ser asi,
 * deja la referencia en la columna posible_duplicado_de.
 *
 * Tres decisiones que definen su comportamiento:
 *
 *   1. AVISA, NO BLOQUEA. La incidencia se crea siempre. El detector se basa
 *      en parecido de palabras, no en comprension del problema, y por lo tanto
 *      se equivoca: dos incidencias pueden compartir vocabulario sin ser lo
 *      mismo. Impedir el registro convertiria cada error del algoritmo en
 *      trabajo perdido de una persona. Marcar y avisar deja la decision final
 *      en quien sabe.
 *
 *   2. SE COMPARA TITULO Y DESCRIPCION JUNTOS, como un solo texto. Los titulos
 *      son cortos y a menudo genericos ("error al guardar"); la descripcion es
 *      donde esta el detalle que distingue un caso de otro. Ponderarlos por
 *      separado agregaria un parametro mas que calibrar sin evidencia de que
 *      mejore el resultado.
 *
 *   3. SE ELIGE EL MEJOR CANDIDATO, no todos los que superen el umbral. La
 *      columna posible_duplicado_de admite un solo valor, y a efectos
 *      practicos lo que se necesita es "esto ya lo reporto alguien, mira
 *      aquella". Si hubiera varias parecidas, la mas parecida es la que sirve.
 */
import * as Incidencia from '../models/incidencia.model.js';
import { similitud } from '../utils/similitud.js';
import { config } from '../config/env.js';

/** Une los dos campos de texto en el documento que se compara. */
function textoComparable(titulo, descripcion) {
  return `${titulo ?? ''} ${descripcion ?? ''}`;
}

/**
 * Busca la incidencia mas parecida a un texto dentro de un proyecto.
 *
 * @param {object} datos
 * @param {string} datos.titulo
 * @param {string} datos.descripcion
 * @param {number} datos.id_proyecto
 * @param {number} [datos.excluir]  Id que no debe considerarse candidato. Se
 *                                  usa al reanalizar una incidencia ya
 *                                  guardada, para que no se detecte a si misma.
 * @param {number} [umbral]         Por defecto, config.umbralDuplicado.
 *
 * @returns {object|null} Null si nada supera el umbral. Si hay coincidencia:
 *   {
 *     id_incidencia,   la incidencia que ya existia
 *     titulo,          su titulo, para poder mostrarlo sin otra consulta
 *     similitud,       valor entre 0 y 1, redondeado a tres decimales
 *     umbral,          contra que se comparo
 *     evaluadas,       cuantas incidencias se revisaron
 *   }
 */
export function buscarDuplicado(datos, umbral = config.umbralDuplicado) {
  const texto = textoComparable(datos.titulo, datos.descripcion);

  const candidatas = Incidencia.listarCandidatosDuplicado(datos.id_proyecto);

  let mejor = null;

  for (const candidata of candidatas) {
    if (candidata.id_incidencia === datos.excluir) continue;

    const valor = similitud(texto, textoComparable(candidata.titulo, candidata.descripcion));

    // Se usa > y no >= para que, ante empate, gane la primera encontrada. Como
    // las candidatas vienen ordenadas por id, eso significa quedarse con la
    // incidencia MAS ANTIGUA, que es la que corresponde: el duplicado es
    // siempre el que llego despues.
    if (valor > (mejor?.valor ?? 0)) {
      mejor = { valor, candidata };
    }
  }

  if (!mejor || mejor.valor < umbral) return null;

  return {
    id_incidencia: mejor.candidata.id_incidencia,
    titulo: mejor.candidata.titulo,
    similitud: Number(mejor.valor.toFixed(3)),
    umbral,
    evaluadas: candidatas.length,
  };
}

/**
 * Vuelve a analizar una incidencia ya guardada.
 *
 * Sirve para dos situaciones: recalcular despues de ajustar el umbral, y
 * revisar incidencias creadas antes de que existiera el detector.
 *
 * No escribe en la base: devuelve el resultado para que decida quien llama.
 *
 * @returns {object|null} Mismo formato que buscarDuplicado().
 */
export function analizarIncidencia(idIncidencia, umbral = config.umbralDuplicado) {
  const incidencia = Incidencia.obtenerCrudo(idIncidencia);
  if (!incidencia) return null;

  return buscarDuplicado(
    {
      titulo: incidencia.titulo,
      descripcion: incidencia.descripcion,
      id_proyecto: incidencia.id_proyecto,
      excluir: idIncidencia,
    },
    umbral
  );
}
