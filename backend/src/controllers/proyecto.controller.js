/**
 * Controlador de PROYECTO.
 *
 * Traductor entre HTTP y la logica de negocio, igual que el de incidencias:
 * saca los datos de la peticion, se los pasa al service y devuelve el
 * resultado. Sin try/catch, porque Express envia al errorHandler cualquier
 * excepcion lanzada aqui dentro, y los ErrorHttp del service ya traen su
 * codigo (400, 404, 409).
 */
import * as servicioProyectos from '../services/proyecto.service.js';

/**
 * GET /api/proyectos
 * Filtros por cadena de consulta: estado, busqueda, pagina, limite,
 * ordenarPor, direccion.
 */
export function listar(req, res) {
  res.json(servicioProyectos.listarProyectos(req.query));
}

/** GET /api/proyectos/:id */
export function obtener(req, res) {
  res.json(servicioProyectos.obtenerProyecto(req.params.id));
}

/** POST /api/proyectos */
export function crear(req, res) {
  const proyecto = servicioProyectos.crearProyecto(req.body);

  res
    .status(201)
    .location(`${req.baseUrl}/${proyecto.id_proyecto}`)
    .json(proyecto);
}

/** PUT /api/proyectos/:id — actualizacion parcial. */
export function actualizar(req, res) {
  res.json(servicioProyectos.actualizarProyecto(req.params.id, req.body));
}

/**
 * DELETE /api/proyectos/:id
 * Responde 409 si el proyecto todavia tiene incidencias asociadas.
 */
export function eliminar(req, res) {
  res.json(servicioProyectos.eliminarProyecto(req.params.id));
}
