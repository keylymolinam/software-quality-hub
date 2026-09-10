/**
 * Lexico del motor de clasificacion automatica.
 *
 * Este archivo es DATOS, no logica: la lista de terminos que delatan cada
 * categoria y cada nivel de prioridad. La decision se toma en
 * services/clasificacion.service.js.
 *
 * Separarlos tiene un motivo practico: ajustar el motor debe ser editar
 * palabras, no reescribir codigo. Cuando el sistema se use de verdad y
 * aparezca vocabulario propio del equipo ("se pega", "no tira nada"), se
 * agrega aqui y nada mas cambia.
 *
 * ---------------------------------------------------------------------------
 * COMO SE ESCRIBE UN TERMINO
 *
 *   'caida'      coincide con la palabra exacta.
 *   'no carga'   coincide con la frase completa, en ese orden.
 *   'demor*'     coincide con cualquier palabra que empiece asi: demora,
 *                demoran, demoro, demorando. Sirve para verbos conjugados,
 *                donde enumerar todas las formas seria interminable.
 *
 * Los terminos se escriben SIN acentos y en minusculas, porque el texto se
 * normaliza asi antes de compararlo.
 *
 * ---------------------------------------------------------------------------
 * LOS PESOS
 *
 *   3  El termino casi define la categoria por si solo ("vulnerabilidad").
 *   2  Apunta claramente, pero podria aparecer en otra ("bateria").
 *   1  Acompana; solo suma si hay otros ("pantalla", "archivo").
 *
 * Los pesos no salen de ningun calculo: son un juicio sobre cuanto distingue
 * cada palabra. Lo que si es medible, y esta medido, es el resultado final
 * sobre las incidencias de prueba.
 */

/**
 * Terminos que apuntan a cada categoria.
 *
 * OTRO no aparece: no es una categoria con vocabulario propio, es lo que queda
 * cuando ninguna otra reune evidencia suficiente.
 */
export const LEXICO_CATEGORIA = {
  // El sistema, o parte de el, no se puede usar.
  DISPONIBILIDAD: [
    ['no carga', 3],
    ['no funciona', 3],
    ['no responde', 3],
    ['no abre', 3],
    ['no inicia', 3],
    ['fuera de servicio', 3],
    ['no disponible', 3],
    ['inaccesible', 3],
    ['se cae', 3],
    ['se cierra', 3],
    ['se cuelga', 3],
    ['caid*', 3],
    ['error 500', 3],
    ['error 503', 3],
    ['pantalla en blanco', 3],
    ['interrump*', 2],
    ['congel*', 2],
    ['bloque*', 2],
    ['reinici*', 2],
    ['inesperada', 1],
    ['servidor', 1],
  ],

  // Funciona, pero mal: lento o consumiendo demasiado.
  RENDIMIENTO: [
    ['lentitud', 3],
    ['lent*', 3],
    ['demor*', 3],
    ['tarda', 3],
    ['rendimiento', 3],
    ['se degrada', 3],
    ['degrada', 2],
    ['consume', 2],
    ['agota', 2],
    ['sobrecarg*', 2],
    ['optimiz*', 2],
    ['bateria', 2],
    ['memoria', 2],
    ['expira', 2],
    ['demasiado tiempo', 2],
    ['segundos', 1],
    ['minutos', 1],
    ['espera', 1],
  ],

  // Alguien puede ver o hacer algo que no le corresponde.
  SEGURIDAD: [
    ['vulnerabilidad', 3],
    ['sin iniciar sesion', 3],
    ['sin credenciales', 3],
    ['acceso no autorizado', 3],
    ['no autorizado', 3],
    ['credenciales', 3],
    ['contrasena', 3],
    ['autenticacion', 3],
    ['autorizacion', 3],
    ['inyeccion', 3],
    ['cifrad*', 3],
    ['expone', 2],
    ['filtracion', 2],
    ['permiso', 2],
    ['datos sensibles', 2],
    ['privacidad', 2],
    ['token', 2],
    ['seguridad', 2],
  ],

  // Se ve mal, se lee mal, o cuesta usarlo.
  USABILIDAD_INTERFAZ: [
    ['truncad*', 3],
    ['cortad*', 3],
    ['ilegible', 3],
    ['no se alcanza a leer', 3],
    ['no se alcanza', 2],
    ['fuera del area visible', 3],
    ['queda oculto', 3],
    ['usabilidad', 3],
    ['interfaz', 2],
    ['resolucion', 2],
    ['resoluciones', 2],
    ['pixeles', 2],
    ['pulgadas', 2],
    ['tipografia', 2],
    ['alineac*', 2],
    ['desalineado', 2],
    ['boton', 1],
    ['pantalla', 1],
    ['pantallas', 1],
    ['icono', 1],
    ['menu', 1],
    ['titulo', 1],
    ['titulos', 1],
    ['color', 1],
    ['tamano', 1],
  ],

  // Los datos estan mal, faltan, o no se pueden mover.
  DATOS_INTEGRIDAD: [
    ['perdida de datos', 3],
    ['se pierden los datos', 3],
    ['faltan registros', 3],
    ['falta informacion', 3],
    ['datos incorrectos', 3],
    ['inconsistente', 3],
    ['no coincide', 3],
    ['no cuadra', 3],
    ['migracion', 3],
    ['archivo vacio', 3],
    ['descuadre', 3],
    ['duplicad*', 2],
    ['export*', 2],
    ['import*', 2],
    ['respaldo', 2],
    ['separador', 2],
    ['decimal', 2],
    ['calculo', 2],
    ['monto', 2],
    ['montos', 2],
    ['registros', 2],
    ['no se guarda', 2],
    ['factura', 1],
    ['reporte', 1],
    ['archivo', 1],
    ['tabla', 1],
    ['formato', 1],
  ],
};

/**
 * Terminos que indican que NO se trata de una falla, sino de una peticion.
 *
 * Es una distincion propia de cualquier sistema de incidencias: pedir un
 * cambio de color de logotipo no es un defecto de usabilidad, es un
 * requerimiento. Sin esta regla, el vocabulario de la peticion ("color",
 * "logotipo") arrastraria la clasificacion hacia USABILIDAD_INTERFAZ.
 *
 * Cuando estos terminos aparecen y no hay evidencia de falla, la categoria
 * es OTRO.
 */
export const LEXICO_PETICION = [
  ['solicitud de', 3],
  ['solicita', 3],
  ['se solicita', 3],
  ['requerimiento', 3],
  ['sugerencia', 3],
  ['sugiere', 2],
  ['propuesta', 2],
  ['seria bueno', 2],
  ['nos gustaria', 2],
  ['mejora', 1],
  ['cambio de', 1],
  ['actualizar el', 1],
];

/**
 * Terminos que indican que una falla ES una falla.
 *
 * Sirven de contrapeso a LEXICO_PETICION: "se solicita revisar el error que
 * impide guardar" es un defecto, aunque empiece pidiendo algo.
 */
export const LEXICO_DEFECTO = [
  ['error', 2],
  ['falla', 2],
  ['fallo', 2],
  ['no funciona', 2],
  ['no se puede', 2],
  ['no permite', 2],
  ['incorrect*', 2],
  ['problema', 1],
  ['defecto', 2],
];

/**
 * Senales que suben o bajan la prioridad respecto de la base.
 *
 * ALTA reune dos ideas distintas y ambas justifican urgencia:
 *   alcance   a cuanta gente afecta ("todos los clientes", "ningun usuario")
 *   gravedad  que tan malo es lo que pasa ("impide", "se pierden")
 *
 * BAJA reune lo contrario: cosmetico, opcional, o una peticion sin apuro.
 */
export const SENALES_PRIORIDAD = {
  ALTA: [
    ['urgente', 3],
    ['critic*', 3],
    ['grave', 3],
    ['bloquea', 3],
    ['bloqueante', 3],
    ['impide', 3],
    ['se pierden', 3],
    ['perdida', 3],
    ['faltan registros', 3],
    ['vulnerabilidad', 3],
    ['todos los clientes', 3],
    ['todos los usuarios', 3],
    ['ningun usuario', 3],
    ['no pueden', 2],
    ['no puede', 2],
    ['inmediat*', 2],
    ['produccion', 2],
    ['expone', 2],
    ['todos los', 2],
    ['ningun', 2],
    ['ninguna', 2],
  ],
  BAJA: [
    ['cosmetic*', 3],
    ['estetic*', 3],
    ['menor', 2],
    ['sugerencia', 2],
    ['solicitud de', 2],
    ['solicita', 2],
    ['cuando se pueda', 2],
    ['no es urgente', 3],
    ['sin apuro', 2],
    ['detalle menor', 3],
  ],
};

/**
 * Prioridad de partida segun la categoria, antes de aplicar las senales.
 *
 * Refleja el impacto tipico de cada tipo de problema: que nadie pueda entrar
 * al sistema, o que se pueda entrar sin permiso, son situaciones que empiezan
 * siendo graves; que un texto se vea cortado, no.
 *
 * Es solo el punto de partida: las senales del texto pueden subirla o bajarla.
 */
export const PRIORIDAD_BASE = {
  SEGURIDAD: 'ALTA',
  DISPONIBILIDAD: 'ALTA',
  DATOS_INTEGRIDAD: 'MEDIA',
  RENDIMIENTO: 'MEDIA',
  USABILIDAD_INTERFAZ: 'BAJA',
  OTRO: 'MEDIA',
};

/**
 * Orden de desempate entre categorias con igual puntaje.
 *
 * De mas critica a menos. El criterio es el costo de equivocarse: clasificar
 * un problema de seguridad como uno de interfaz lo esconde; al reves, solo
 * hace que alguien lo revise antes de tiempo. Ante la duda, conviene el error
 * que se nota.
 */
export const ORDEN_DESEMPATE = [
  'SEGURIDAD',
  'DISPONIBILIDAD',
  'DATOS_INTEGRIDAD',
  'RENDIMIENTO',
  'USABILIDAD_INTERFAZ',
];
