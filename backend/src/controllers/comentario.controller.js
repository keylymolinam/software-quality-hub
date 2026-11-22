/**
 * Controlador de COMENTARIO.
 *
 * Traduce HTTP a negocio y nada mas: lee la peticion, llama al service y
 * responde. Los errores los lanza el service con su status y los entrega
 * middlewares/errorHandler.js, por eso aqui no hay try/catch.
 *
 * Las rutas cuelgan de la incidencia (/api/incidencias/:id/comentarios): un
 * comentario no existe fuera de la incidencia que comenta.
 */
import * as servicioComentarios from '../services/comentario.service.js';

/** GET /api/incidencias/:id/comentarios */
export function listar(req, res) {
  const comentarios = servicioComentarios.listarComentarios(req.params.id);

  res.json({
    id_incidencia: Number(req.params.id),
    total: comentarios.length,
    comentarios,
  });
}

/**
 * POST /api/incidencias/:id/comentarios
 *
 * El autor se toma de la sesion (req.usuario), nunca del cuerpo.
 */
export function crear(req, res) {
  const comentario = servicioComentarios.agregarComentario(
    req.params.id,
    req.body,
    req.usuario.id_usuario
  );

  res.status(201).json(comentario);
}
