/**
 * De donde se llego al detalle de una incidencia, para poder volver ahi.
 *
 * Con dos vistas de incidencias, "Volver al listado" fijo a /incidencias
 * devolvia a la lista a quien venia del tablero, y sin los filtros que tenia
 * puestos. Lo noto la autora al probar las dos vistas.
 *
 * El origen viaja en el estado del historial (el `state` de los Link de
 * react-router), no en la direccion: es un dato de la navegacion, no de la
 * pantalla, y meterlo en la cadena de consulta ensuciaria cada enlace a una
 * incidencia. El navegador lo conserva al recargar y con atras/adelante.
 * Quien entra al detalle por un enlace pegado no trae origen, y vuelve a la
 * lista completa, como antes.
 */

/** El estado que se pasa a un Link hacia el detalle desde una vista. */
export function estadoDesde(location) {
  return { desde: location.pathname + location.search };
}

/**
 * A donde lleva "volver" y con que texto, segun el estado recibido.
 * Solo se aceptan las dos vistas: un origen raro cae en la lista completa.
 */
export function volverA(estado) {
  const desde = estado?.desde ?? '';

  if (desde.startsWith('/tablero')) {
    return { ruta: desde, texto: 'Volver al tablero' };
  }
  if (desde === '/incidencias' || desde.startsWith('/incidencias?')) {
    return { ruta: desde, texto: 'Volver al listado' };
  }
  return { ruta: '/incidencias', texto: 'Volver al listado' };
}
