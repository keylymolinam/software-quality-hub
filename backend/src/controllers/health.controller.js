/**
 * Controlador de estado del servicio.
 *
 * Un controlador tiene una sola responsabilidad: traducir entre HTTP y la
 * logica de negocio. Recibe la peticion (req), pide el trabajo a un service
 * y devuelve la respuesta (res). Nunca consulta la base de datos por su cuenta.
 */
import { config } from '../config/env.js';
import { verificarBaseDatos } from '../services/health.service.js';

export function obtenerEstado(req, res) {
  const baseDatos = verificarBaseDatos();

  res.json({
    estado: baseDatos.conectada ? 'operativo' : 'degradado',
    servicio: 'Software Quality Hub API',
    version: '0.1.0',
    entorno: config.nodeEnv,
    baseDatos,
    marcaTiempo: new Date().toISOString(),
  });
}
