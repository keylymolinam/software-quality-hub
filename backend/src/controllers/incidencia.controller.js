/**
 * Controlador de INCIDENCIA.
 *
 * Un controlador es un traductor entre HTTP y la logica de negocio. Su trabajo
 * completo son tres pasos:
 *
 *   1. Sacar los datos de la peticion (req.params, req.query, req.body).
 *   2. Pedirle el trabajo al service.
 *   3. Devolver el resultado con el codigo HTTP que corresponda.
 *
 * Si un controlador crece mas alla de eso, es senal de que hay logica de
 * negocio en el lugar equivocado y deberia bajar al service.
 *
 * Sobre el manejo de errores: aqui NO hay bloques try/catch. Express atrapa
 * por su cuenta cualquier excepcion lanzada dentro de un manejador sincrono y
 * la envia al middleware errorHandler. Como los services lanzan ErrorHttp con
 * su `status` incluido, la respuesta correcta (400, 404, 409) sale sola.
 * Poner try/catch en cada funcion solo agregaria ruido.
 */
import * as servicioIncidencias from '../services/incidencia.service.js';
import { clasificar } from '../services/clasificacion.service.js';

/**
 * GET /api/incidencias
 *
 * Los filtros llegan por la cadena de consulta, por ejemplo:
 *   /api/incidencias?estado=ABIERTA&prioridad=ALTA&pagina=2
 *
 * Ojo: todo lo que viene en req.query es TEXTO, siempre. `?limite=10` llega
 * como la cadena "10", no como el numero 10. El controlador no se preocupa de
 * convertirlo; el service ya lo hace al validar.
 */
export function listar(req, res) {
  const resultado = servicioIncidencias.listarIncidencias(req.query);

  // Se responde un objeto { datos, paginacion } y no un arreglo pelado. Un
  // arreglo no deja lugar donde poner el total ni la pagina actual, y cambiar
  // el formato despues romperia a todos los que ya consumen la API.
  res.json(resultado);
}

/**
 * GET /api/incidencias/:id
 *
 * req.params.id es el trozo de la URL que calza con :id. Llega como texto.
 * Si la incidencia no existe, el service lanza un 404 y esta funcion ni se
 * entera: nunca llega a ejecutar el res.json().
 */
export function obtener(req, res) {
  const incidencia = servicioIncidencias.obtenerIncidencia(req.params.id);
  res.json(incidencia);
}

/**
 * POST /api/incidencias
 *
 * Responde 201 Created, no 200. La diferencia importa: 201 significa
 * "se creo un recurso nuevo", y por convencion se acompana de la cabecera
 * Location con la direccion donde queda ese recurso.
 *
 * Se devuelve la incidencia completa (y no solo el id) porque trae datos que
 * el cliente no tenia: el id asignado, la fecha de creacion puesta por SQLite
 * y los nombres resueltos del proyecto y los usuarios. Asi el frontend puede
 * pintar la fila nueva sin hacer una segunda peticion.
 */
export function crear(req, res) {
  // El autor sale de req.usuario, que llena el middleware requiereAutenticacion.
  const incidencia = servicioIncidencias.crearIncidencia(req.body, req.usuario.id_usuario);

  res
    .status(201)
    .location(`${req.baseUrl}/${incidencia.id_incidencia}`)
    .json(incidencia);
}

/**
 * PUT /api/incidencias/:id
 *
 * Se acepta actualizacion PARCIAL: basta con enviar los campos que cambian.
 * En sentido estricto eso corresponde a PATCH, y PUT deberia reemplazar el
 * recurso completo. Se usa PUT igual por dos razones practicas: es lo que
 * espera cualquier formulario de edicion, y evita que el cliente tenga que
 * reenviar campos que no piensa tocar (con el riesgo de borrarlos por
 * omision). Queda documentado para que la decision sea explicita y no un
 * descuido.
 */
export function actualizar(req, res) {
  const incidencia = servicioIncidencias.actualizarIncidencia(req.params.id, req.body);
  res.json(incidencia);
}

/**
 * DELETE /api/incidencias/:id
 *
 * Se responde 200 con un cuerpo de confirmacion en lugar del 204 No Content
 * que suele recomendarse. Motivo: 204 obliga a responder sin cuerpo, y un
 * cuerpo que confirma que id se elimino hace mucho mas facil depurar y
 * probar la API desde el navegador o desde curl.
 */
export function eliminar(req, res) {
  const resultado = servicioIncidencias.eliminarIncidencia(req.params.id);
  res.json(resultado);
}

/**
 * POST /api/incidencias/:id/transicion
 *
 * Cuerpo: { estado, comentario? }
 *
 * `modificado_por` NO se envia: se toma de la sesion. Aceptarlo desde el
 * cuerpo permitiria firmar cambios con el nombre de otra persona, y la
 * bitacora dejaria de ser una fuente confiable.
 *
 * Es la unica via para cambiar el estado de una incidencia. Se modela como una
 * ACCION sobre el recurso y no como un PUT del campo `estado` porque no es una
 * simple edicion: valida el flujo permitido, ajusta la fecha de resolucion y
 * escribe la bitacora. El nombre de la direccion refleja lo que ocurre.
 *
 * Se responde 200 y no 201: no se esta creando un recurso que el cliente vaya
 * a consultar despues por su propia direccion, se esta modificando uno que ya
 * existia.
 */
export function transicionar(req, res) {
  const incidencia = servicioIncidencias.cambiarEstado(
    req.params.id,
    req.body,
    req.usuario.id_usuario
  );
  res.json(incidencia);
}

/**
 * GET /api/incidencias/:id/historial
 *
 * Devuelve la bitacora ordenada del cambio mas antiguo al mas reciente, para
 * que el frontend la muestre como una linea de tiempo.
 */
export function historial(req, res) {
  const movimientos = servicioIncidencias.obtenerHistorial(req.params.id);

  res.json({
    id_incidencia: Number(req.params.id),
    total: movimientos.length,
    movimientos,
  });
}

/**
 * POST /api/incidencias/clasificar
 *
 * Cuerpo: { titulo, descripcion }
 *
 * Devuelve lo que el motor DEDUCIRIA, sin crear ni guardar nada. Existe para
 * que el formulario pueda mostrar la categoria y prioridad sugeridas mientras
 * la persona escribe, con la evidencia que las justifica.
 *
 * Es un POST y no un GET porque la descripcion de una incidencia puede tener
 * miles de caracteres, y eso no cabe razonablemente en una direccion. Que no
 * modifique nada no obliga a usar GET: obliga a no tener efectos secundarios,
 * y no los tiene.
 */
export function clasificarTexto(req, res) {
  res.json(clasificar(req.body ?? {}));
}
