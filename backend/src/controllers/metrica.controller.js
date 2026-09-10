/**
 * Controlador de metricas e indice de salud.
 *
 * Traduce entre HTTP y salud.service.js. Sin logica propia, como el resto.
 */
import * as servicioSalud from '../services/salud.service.js';

/**
 * GET /api/metricas/salud
 *
 * Indice global mas el de cada proyecto, ordenados de peor a mejor. Es lo que
 * necesita la pantalla principal del dashboard en una sola peticion.
 */
export function salud(req, res) {
  res.json(servicioSalud.calcularSaludGeneral());
}

/** GET /api/metricas/salud/:id — indice de un proyecto concreto. */
export function saludProyecto(req, res) {
  res.json(servicioSalud.calcularSaludProyecto(req.params.id));
}

/**
 * POST /api/metricas/snapshot
 *
 * Guarda en la tabla METRICA el estado actual del sistema y de cada proyecto.
 * Es la operacion que convierte el indice en una serie de tiempo, y por eso es
 * un POST: escribe.
 */
export function snapshot(req, res) {
  res.status(201).json(servicioSalud.registrarSnapshot());
}

/**
 * GET /api/metricas/historico
 *
 * Parametros: tipo_metrica, id_proyecto. Por defecto devuelve la evolucion del
 * indice de salud global.
 */
export function historico(req, res) {
  res.json(servicioSalud.obtenerHistorico(req.query));
}
