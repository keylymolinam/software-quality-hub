/**
 * Sugerencia del motor de clasificacion mientras se escribe.
 *
 * Le pregunta al backend que categoria y prioridad deduciria del texto que hay
 * escrito, sin crear nada. Existe para que quien reporta vea lo que el sistema
 * entendio ANTES de guardar, y pueda corregirlo si se equivoco.
 *
 * ---------------------------------------------------------------------------
 * POR QUE UN HOOK APARTE Y NO usePeticion
 *
 * Una sugerencia no se comporta como una carga de datos, y las diferencias son
 * las tres reglas de este archivo:
 *
 *   1. Falla en silencio. Si el motor no responde, el formulario tiene que
 *      seguir funcionando: la clasificacion es opcional, y el backend la
 *      volvera a calcular al guardar. Un mensaje de error rojo por una
 *      sugerencia que no llego seria alarmar por algo que no impide nada.
 *
 *   2. No pregunta con texto insuficiente. Con tres letras escritas no hay nada
 *      que deducir, y la respuesta seria OTRO con confianza 0: una sugerencia
 *      equivocada es peor que ninguna, porque invita a corregirla a mano.
 *
 *   3. Conserva la sugerencia anterior mientras llega la nueva. Si se vaciara
 *      en cada pulsacion, el panel parpadearia todo el tiempo que se escribe.
 */
import { useEffect, useState } from 'react';

import { clasificarTexto } from '../api/incidencias.js';

/** Milisegundos de espera tras la ultima pulsacion. */
const ESPERA = 500;

/**
 * Caracteres minimos entre titulo y descripcion para molestar al servidor.
 *
 * Quince es aproximadamente lo que ocupa una frase con un sintoma reconocible
 * ("el portal no carga"). Por debajo de eso el lexico no tiene de donde agarrar.
 */
const MINIMO_TEXTO = 15;

/**
 * @param {string}  titulo
 * @param {string}  descripcion
 * @param {boolean} activa  Si es false no pregunta nada y limpia la sugerencia.
 *                          Se usa cuando la persona ya eligio categoria y
 *                          prioridad: en ese caso el motor no se ejecuta al
 *                          guardar, y mostrar una sugerencia haria creer que si.
 */
export function useClasificacionSugerida(titulo, descripcion, activa) {
  const [sugerencia, setSugerencia] = useState(null);
  const [consultando, setConsultando] = useState(false);

  const texto = `${titulo} ${descripcion}`.trim();
  const suficiente = texto.length >= MINIMO_TEXTO;

  useEffect(() => {
    if (!activa || !suficiente) {
      setSugerencia(null);
      setConsultando(false);
      return undefined;
    }

    // Marca si este efecto sigue siendo el vigente, para que una respuesta
    // lenta de un texto ya modificado no sobreescriba a la del texto actual.
    let vigente = true;

    setConsultando(true);

    const temporizador = setTimeout(() => {
      clasificarTexto({ titulo, descripcion })
        .then((resultado) => {
          if (vigente) setSugerencia(resultado);
        })
        .catch(() => {
          // A proposito sin manejo: ver la regla 1 de la cabecera.
        })
        .finally(() => {
          if (vigente) setConsultando(false);
        });
    }, ESPERA);

    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [titulo, descripcion, activa, suficiente]);

  return { sugerencia, consultando, suficiente };
}
