/**
 * Llamadas al endpoint de estado del backend.
 */
import { api } from './client.js';

export function obtenerEstadoApi() {
  return api.get('/health');
}
