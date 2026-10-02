/**
 * Doble de hooks/usePeticion.js para las pruebas de pantallas.
 *
 * Devuelve lo que el escenario en curso haya declarado para cada clave, con la
 * misma forma que el hook de verdad: { datos, cargando, error, reintentar }.
 *
 * Por que un doble y no el hook real: en render de servidor los efectos de
 * React no se ejecutan, asi que una pantalla que pide sus datos en useEffect se
 * quedaria para siempre en su estado de carga. Sustituyendolo se puede colocar
 * a la pantalla en cualquier situacion, incluidas las que cuesta reproducir a
 * mano: un 404, un conflicto de estado, un sistema sin datos suficientes.
 *
 * El escenario viaja por una variable global y no por un parametro porque el
 * hook lo llama la pantalla, no la prueba: no hay por donde pasarselo.
 */
export function usePeticion(peticion, clave) {
  const escenario = globalThis.__ESCENARIO_DE_PRUEBA;

  if (!escenario) {
    throw new Error('Ninguna prueba declaro un escenario antes de dibujar la pantalla.');
  }

  const respuesta = escenario[clave];

  // Un fallo ruidoso y temprano: si la pantalla cambia la clave de una
  // peticion, la prueba dice exactamente eso en vez de fallar mas adelante con
  // un "cannot read properties of undefined" que no explica nada.
  if (!respuesta) {
    throw new Error(
      `El escenario no define la clave '${clave}'. Declaradas: ${Object.keys(escenario).join(', ')}.`
    );
  }

  return respuesta;
}
