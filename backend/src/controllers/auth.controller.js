/**
 * Controlador de autenticacion.
 *
 * Dos operaciones: entrar y preguntar quien soy.
 *
 * No hay endpoint de "cerrar sesion". Con tokens JWT el servidor no guarda
 * ningun registro de sesiones abiertas, asi que no tiene nada que cerrar:
 * salir consiste en que el frontend borre el token que tenia guardado. Un
 * POST /logout que no hiciera nada seria peor que no tenerlo, porque sugeriria
 * una garantia que el sistema no da.
 */
import * as servicioAuth from '../services/auth.service.js';

/**
 * POST /api/auth/login
 * Cuerpo: { correo_electronico, contrasena }
 *
 * Responde 200 con el token y los datos publicos del usuario, o 401 si las
 * credenciales no son correctas.
 */
export function login(req, res) {
  res.json(servicioAuth.iniciarSesion(req.body));
}

/**
 * GET /api/auth/yo
 *
 * Devuelve el usuario de la sesion actual. Requiere el middleware
 * requiereAutenticacion, que es quien deja los datos en req.usuario.
 *
 * Le sirve al frontend para dos cosas al arrancar: saber si el token que tenia
 * guardado sigue siendo valido, y recuperar el nombre y el rol para mostrarlos
 * sin volver a pedir credenciales.
 */
export function yo(req, res) {
  res.json(req.usuario);
}
