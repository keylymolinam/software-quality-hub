/**
 * Llamadas al backend relacionadas con la sesion.
 *
 * Este archivo solo traduce funciones a rutas. Que se hace con el resultado
 * (guardarlo, mostrarlo, redirigir) es asunto del contexto de sesion.
 */
import { api } from './client.js';

/**
 * Inicia sesion.
 * @returns {Promise<{ token, expira_en, usuario }>}
 * @throws {ErrorApi} 401 si las credenciales no son correctas.
 */
export function iniciarSesion(correoElectronico, contrasena) {
  return api.post('/auth/login', {
    correo_electronico: correoElectronico,
    contrasena,
  });
}

/**
 * Devuelve el usuario de la sesion actual segun el backend.
 *
 * Se usa al arrancar la aplicacion para comprobar si el token guardado sigue
 * siendo valido. No basta con que exista un token en el navegador: pudo
 * expirar, o la cuenta pudo eliminarse, y solo el servidor lo sabe.
 */
export function obtenerSesion() {
  return api.get('/auth/yo');
}
