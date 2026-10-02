/**
 * Vocabulario de INCIDENCIA para la interfaz.
 *
 * El backend guarda y devuelve los valores en mayusculas y sin espacios
 * ('EN_PROGRESO', 'USABILIDAD_INTERFAZ') porque son identificadores, no texto
 * para leer. Esta archivo traduce cada uno a como se muestra en pantalla, y
 * reune las listas que alimentan los desplegables de filtro.
 *
 * Por que un archivo aparte y no las etiquetas escritas en cada componente:
 * la tabla, los filtros y el futuro formulario muestran los mismos valores. Si
 * cada uno escribiera su propio texto, bastaria con que uno quedara sin
 * actualizar para que la misma incidencia apareciera con dos nombres distintos
 * segun la pantalla.
 *
 * ---------------------------------------------------------------------------
 * SOBRE LA DUPLICACION
 *
 * Estas listas repiten los enumerados que ya estan en schema.sql y en
 * services/incidencia.service.js. Es la misma duplicacion que el backend ya
 * asume entre la base y el service, y por el mismo motivo: aqui no se validan
 * datos, se dibuja un desplegable, y para eso hay que conocer las opciones
 * antes de pedir nada al servidor.
 *
 * Quien agregue un valor nuevo tiene que tocar los tres lugares. La senal de
 * que falto este es visible de inmediato: el valor aparece en la tabla con su
 * nombre tecnico en vez del legible, porque etiquetaDe() no lo encuentra.
 */

/**
 * Estados, en el orden del flujo de trabajo y no alfabetico.
 *
 * Ese orden es el que se usa para dibujar el desplegable: quien busca una
 * incidencia piensa en "las que estan recien abiertas" o "las ya cerradas",
 * y encontrar las opciones en el mismo orden en que ocurren ahorra leerlas
 * todas.
 */
export const ESTADOS = [
  { valor: 'ABIERTA', etiqueta: 'Abierta' },
  { valor: 'EN_PROGRESO', etiqueta: 'En progreso' },
  { valor: 'RESUELTA', etiqueta: 'Resuelta' },
  { valor: 'CERRADA', etiqueta: 'Cerrada' },
];

/** Prioridades, de la mas grave a la menos grave. */
export const PRIORIDADES = [
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'BAJA', etiqueta: 'Baja' },
];

/**
 * Categorias. OTRO va al final aunque alfabeticamente no le corresponda:
 * no es una categoria mas, es lo que queda cuando ninguna calza.
 */
export const CATEGORIAS = [
  { valor: 'DISPONIBILIDAD', etiqueta: 'Disponibilidad' },
  { valor: 'RENDIMIENTO', etiqueta: 'Rendimiento' },
  { valor: 'SEGURIDAD', etiqueta: 'Seguridad' },
  { valor: 'USABILIDAD_INTERFAZ', etiqueta: 'Usabilidad / interfaz' },
  { valor: 'DATOS_INTEGRIDAD', etiqueta: 'Datos e integridad' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

/**
 * Criterios de orden que acepta el backend.
 *
 * La lista corresponde a ORDENES_PERMITIDOS de models/incidencia.model.js. Un
 * valor que no este alli no produce un error: el backend cae en su orden por
 * defecto, y el usuario veria un listado que no obedece al criterio que eligio.
 */
export const ORDENES = [
  { valor: 'fecha_creacion', etiqueta: 'Fecha de creaci\u00f3n' },
  { valor: 'prioridad', etiqueta: 'Prioridad' },
  { valor: 'estado', etiqueta: 'Estado' },
  { valor: 'titulo', etiqueta: 'T\u00edtulo' },
];

/**
 * Como se llama en pantalla cada cambio de estado.
 *
 * La clave es 'ORIGEN->DESTINO' y no solo el destino, porque el mismo estado de
 * llegada significa cosas distintas segun de donde se venga: pasar a
 * EN_PROGRESO desde ABIERTA es empezar a trabajar, y desde RESUELTA es reabrir
 * porque la solucion no resulto. Un boton que dijera "En progreso" en los dos
 * casos obligaria a mirar el estado actual para entender que va a hacer.
 *
 * Lo que esta tabla NO contiene es la forma de la maquina de estados: que
 * transiciones existen lo dice el backend en `transiciones_posibles`. Aqui solo
 * esta el texto, que es lo unico que el servidor no puede aportar.
 *
 * Sobre `exigeMotivo`: marca el comentario como obligatorio antes de enviar, y
 * repite TRANSICIONES_QUE_EXIGEN_MOTIVO de services/incidencia.service.js. La
 * duplicacion es una comodidad, no la regla: la hace cumplir el servidor, que
 * responde 400 con el detalle en el campo `comentario`. Si las dos listas
 * discreparan, lo peor que puede pasar es pedir un motivo que no hacia falta, o
 * no pedirlo y recibir el 400 que la pantalla ya sabe mostrar junto al campo.
 * Nunca se guarda algo que el backend no haya aceptado.
 */
export const ACCIONES_TRANSICION = {
  'ABIERTA->EN_PROGRESO': { etiqueta: 'Tomar y empezar', exigeMotivo: false },
  'ABIERTA->CERRADA': { etiqueta: 'Cerrar sin resolver', exigeMotivo: true },
  'EN_PROGRESO->RESUELTA': { etiqueta: 'Marcar resuelta', exigeMotivo: false },
  'RESUELTA->EN_PROGRESO': { etiqueta: 'Reabrir', exigeMotivo: false },
  'RESUELTA->CERRADA': { etiqueta: 'Cerrar', exigeMotivo: false },
};

/**
 * Devuelve el texto legible de un valor.
 *
 * Si el valor no esta en la lista se devuelve tal cual en vez de dejar la
 * celda vacia: un nombre tecnico a la vista es feo, pero permite darse cuenta
 * de que hay un valor nuevo sin traducir. Una celda en blanco esconderia el
 * problema y haria pensar que el dato no existe.
 *
 * @param {Array}  lista  Una de las listas exportadas arriba.
 * @param {string} valor  Valor tal como lo devuelve el backend.
 */
export function etiquetaDe(lista, valor) {
  return lista.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;
}

/**
 * Describe una transicion para la interfaz: como se llama y si exige motivo.
 *
 * Cuando la combinacion no esta en ACCIONES_TRANSICION se arma un texto con el
 * nombre del estado de destino en vez de devolver undefined. Asi una transicion
 * agregada en el backend aparece y funciona de inmediato, con un nombre menos
 * natural que delata que falta nombrarla aqui; devolver undefined habria dejado
 * un boton sin etiqueta, que es un defecto mucho mas difuso de diagnosticar.
 */
export function accionDe(estadoActual, estadoDestino) {
  return (
    ACCIONES_TRANSICION[`${estadoActual}->${estadoDestino}`] ?? {
      etiqueta: `Pasar a ${etiquetaDe(ESTADOS, estadoDestino).toLowerCase()}`,
      exigeMotivo: false,
    }
  );
}

/**
 * Convierte una fecha del backend en un Date, o null si no se puede.
 *
 * El backend las entrega en UTC con formato 'YYYY-MM-DD HH:MM:SS'. Ese texto no
 * es una fecha ISO valida para el navegador (le falta la 'T' y la zona), y
 * Safari devuelve "Invalid Date" al intentarlo. Por eso se completa antes de
 * construir el Date, en lugar de confiar en que cada navegador adivine igual.
 *
 * Vive aqui, privada, porque las dos funciones de abajo necesitan exactamente
 * la misma correccion y repetirla seria arriesgarse a corregirla en una sola.
 */
function interpretar(texto) {
  if (!texto) return null;

  const fecha = new Date(`${texto.replace(' ', 'T')}Z`);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Formatea una fecha para el listado: solo el dia, sin la hora.
 *
 * En una tabla la hora exacta ocupa ancho y no ayuda a decidir nada. El detalle
 * de la incidencia si la muestra, con formatearFechaHora().
 *
 * Si el texto no se puede interpretar se devuelve tal cual en lugar de
 * "Invalid Date": el dato crudo a la vista permite ver que llego mal.
 */
export function formatearFecha(texto) {
  const fecha = interpretar(texto);

  if (!fecha) return texto || '-';

  return fecha.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatea una fecha con su hora, para el detalle y la linea de tiempo.
 *
 * Aqui la hora si es informacion: dos cambios de estado del mismo dia solo se
 * distinguen por ella, y sin eso la bitacora no permite decir cuanto tiempo
 * estuvo la incidencia en cada estado, que es justo lo que se le pregunta.
 */
export function formatearFechaHora(texto) {
  const fecha = interpretar(texto);

  if (!fecha) return texto || '-';

  return fecha.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
