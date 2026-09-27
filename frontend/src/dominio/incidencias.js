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
  { valor: 'fecha_creacion', etiqueta: 'Fecha de creacion' },
  { valor: 'prioridad', etiqueta: 'Prioridad' },
  { valor: 'estado', etiqueta: 'Estado' },
  { valor: 'titulo', etiqueta: 'Titulo' },
];

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
 * Formatea una fecha del backend para mostrarla.
 *
 * El backend las entrega en UTC con formato 'YYYY-MM-DD HH:MM:SS'. Ese texto no
 * es una fecha ISO valida para el navegador (le falta la 'T' y la zona), y
 * Safari devuelve "Invalid Date" al intentarlo. Por eso se completa antes de
 * construir el Date, en lugar de confiar en que cada navegador adivine igual.
 *
 * Se muestra solo el dia, sin la hora: en un listado la hora exacta ocupa
 * espacio y no ayuda a decidir nada. El detalle de la incidencia si la mostrara.
 */
export function formatearFecha(texto) {
  if (!texto) return '-';

  const fecha = new Date(`${texto.replace(' ', 'T')}Z`);

  if (Number.isNaN(fecha.getTime())) return texto;

  return fecha.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
