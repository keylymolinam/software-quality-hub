/**
 * Controlador de USUARIO.
 *
 * Mismo esquema que los demas: traduce entre HTTP y el service, sin logica
 * propia y sin try/catch.
 *
 * Ninguna de estas respuestas incluye la contrasena ni su hash. Eso no se
 * consigue aqui, sino en el model, que jamas devuelve esa columna. Un
 * controlador que tuviera que acordarse de borrar campos sensibles antes de
 * responder seria un descuido esperando a ocurrir.
 */
import * as servicioUsuarios from '../services/usuario.service.js';

/** GET /api/usuarios — filtros: rol, busqueda, pagina, limite. */
export function listar(req, res) {
  res.json(servicioUsuarios.listarUsuarios(req.query));
}

/** GET /api/usuarios/:id */
export function obtener(req, res) {
  res.json(servicioUsuarios.obtenerUsuario(req.params.id));
}

/** POST /api/usuarios */
export function crear(req, res) {
  const usuario = servicioUsuarios.crearUsuario(req.body);

  res
    .status(201)
    .location(`${req.baseUrl}/${usuario.id_usuario}`)
    .json(usuario);
}

/** PUT /api/usuarios/:id — actualizacion parcial; no cambia la contrasena. */
export function actualizar(req, res) {
  // req.usuario se necesita para decidir si puede cambiar el rol.
  res.json(servicioUsuarios.actualizarUsuario(req.params.id, req.body, req.usuario));
}

/**
 * PUT /api/usuarios/:id/contrasena
 * Cuerpo: { contrasena_actual, contrasena_nueva }
 *
 * Ruta separada del PUT general porque es una operacion distinta: exige
 * conocer la contrasena vigente, no solo tener permiso para editar al usuario.
 */
export function actualizarContrasena(req, res) {
  res.json(servicioUsuarios.cambiarContrasena(req.params.id, req.body));
}

/**
 * PUT /api/usuarios/:id/restablecer-contrasena
 * Cuerpo: { contrasena_nueva }
 *
 * La recuperacion de una clave olvidada, a cargo de un administrador. Ruta
 * distinta de la anterior porque la regla es la opuesta: no pide la clave
 * vigente, y por eso no la puede usar el propio dueno.
 */
export function restablecerContrasena(req, res) {
  // req.usuario se necesita para rechazar el restablecimiento de la propia cuenta.
  res.json(servicioUsuarios.restablecerContrasena(req.params.id, req.body, req.usuario));
}

/** DELETE /api/usuarios/:id — 409 si tiene incidencias o historial. */
export function eliminar(req, res) {
  res.json(servicioUsuarios.eliminarUsuario(req.params.id));
}
