/**
 * Hook para pedir datos al backend.
 *
 * Toda pantalla que carga datos necesita lo mismo: saber si esta esperando, que
 * llego, y que fallo si fallo. Escribirlo en cada pagina significa repetir tres
 * useState y un useEffect, y repetir tambien los dos descuidos que se explican
 * mas abajo.
 *
 *     const { datos, cargando, error, reintentar } = usePeticion(
 *       () => listarIncidencias(filtros),
 *       JSON.stringify(filtros)
 *     );
 *
 * ---------------------------------------------------------------------------
 * POR QUE UNA `clave` DE TEXTO Y NO LA FUNCION COMO DEPENDENCIA
 *
 * La funcion que se recibe es una flecha escrita dentro del componente, asi que
 * es un objeto nuevo en cada render. Si el efecto dependiera de ella, se
 * dispararia una peticion en cada render: la respuesta cambia el estado, el
 * cambio provoca otro render, y ese render crea otra funcion. Un bucle infinito
 * de peticiones.
 *
 * La `clave` corta ese circulo: es un texto que resume de que depende la
 * peticion. Mientras no cambie, no se vuelve a pedir nada. Cuando cambia, el
 * efecto se ejecuta de nuevo y usa la funcion del render mas reciente, que es
 * la que ya conoce los filtros nuevos.
 */
import { useCallback, useEffect, useState } from 'react';

export function usePeticion(peticion, clave) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Permite repetir la peticion sin cambiar la clave. Hace falta para el boton
  // de reintentar: si el servidor no respondio, la pantalla quedaria atrapada
  // en el error hasta que el usuario modificara un filtro, que no tiene nada
  // que ver con el problema.
  const [intento, setIntento] = useState(0);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  useEffect(() => {
    // Marca si este efecto sigue siendo el vigente. Resuelve dos cosas:
    //
    // 1. Respuestas que llegan fuera de orden. Si alguien filtra por ABIERTA y
    //    enseguida por CERRADA, salen dos peticiones y nada garantiza que
    //    vuelvan en ese orden. Sin esta marca, una respuesta lenta de ABIERTA
    //    podria pintarse despues de la de CERRADA, y la tabla mostraria datos
    //    que no corresponden a los filtros que estan a la vista.
    //
    // 2. Cambiar el estado de un componente que ya no esta montado, cosa que
    //    ocurre al salir de la pagina antes de que responda el servidor.
    let vigente = true;

    setCargando(true);
    setError(null);

    peticion()
      .then((resultado) => {
        if (vigente) setDatos(resultado);
      })
      .catch((fallo) => {
        if (!vigente) return;
        // Se borran los datos anteriores a proposito: dejarlos visibles junto a
        // un mensaje de error haria creer que lo que se ve sigue siendo valido.
        setDatos(null);
        setError(fallo);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    // React ejecuta esta limpieza antes de volver a lanzar el efecto, y tambien
    // al desmontar el componente.
    return () => {
      vigente = false;
    };

    // `peticion` se omite a proposito: ver la explicacion de la cabecera.
  }, [clave, intento]);

  return { datos, cargando, error, reintentar };
}
