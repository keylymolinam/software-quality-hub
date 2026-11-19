/**
 * Llamadas a los endpoints de metricas.
 *
 * Como el resto de api/, aqui solo se traducen funciones a rutas: lo que
 * devuelve el backend se entrega tal cual. El indice de salud llega ya
 * calculado, con sus pesos aplicados y su desglose; la interfaz no recalcula
 * nada, porque dos formulas que deberian coincidir acaban discrepando.
 */
import { api } from './client.js';

/**
 * Indice de salud del sistema y de cada proyecto.
 *
 * @returns {Promise<{ global: object, proyectos: object[] }>}
 *   `global` es el indice del sistema completo; `proyectos` viene ordenado de
 *   peor a mejor, con los que no tienen datos suficientes al final.
 *
 * Los dos traen `indice`, `etiqueta`, `datos_suficientes`, el desglose en
 * `componentes` y datos de contexto. `datos_suficientes` hay que mirarlo antes
 * del numero: cuando es false, `etiqueta` vale 'SIN_DATOS' y el indice no
 * significa nada.
 */
export function obtenerSalud() {
  return api.get('/metricas/salud');
}

/**
 * Indice de salud de un solo proyecto, con su desglose.
 *
 * Todavia sin uso en la interfaz: queda para la pantalla del desglose por
 * componente. Se declara junto a la anterior para que el archivo describa el
 * endpoint completo y no haya que volver a leer las rutas del backend.
 */
export function obtenerSaludProyecto(idProyecto) {
  return api.get(`/metricas/salud/${idProyecto}`);
}

/**
 * Pesos del indice de salud: los vigentes, los iniciales y la historia.
 *
 * @returns {Promise<{ vigentes: object, iniciales: object, historial: object[] }>}
 *   Los pesos van en porcentaje entero (40, no 0.4). `vigentes.modificado_por`
 *   es null mientras rijan los iniciales.
 */
export function obtenerPesos() {
  return api.get('/metricas/pesos');
}

/**
 * Fija pesos nuevos para todo el sistema. Solo ADMINISTRADOR.
 *
 * @param {{ antiguedad: number, reapertura: number, densidad: number, motivo: string }} datos
 *   Enteros que sumen 100, y el motivo del cambio.
 */
export function cambiarPesos(datos) {
  return api.put('/metricas/pesos', datos);
}
