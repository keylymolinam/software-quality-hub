/**
 * Rutas de metricas.
 *
 *   Metodo  Direccion                    Quien puede
 *   ------  ---------------------------  ---------------------------
 *   GET     /api/metricas/salud          cualquier sesion
 *   GET     /api/metricas/salud/:id      cualquier sesion
 *   GET     /api/metricas/historico      cualquier sesion
 *   POST    /api/metricas/snapshot       ADMINISTRADOR
 *   GET     /api/metricas/pesos          cualquier sesion
 *   PUT     /api/metricas/pesos          ADMINISTRADOR
 *
 * Leer indicadores lo puede hacer cualquiera del equipo: para eso existen.
 * Guardar una fotografia queda reservado a ADMINISTRADOR porque escribe en la
 * serie historica, y una serie con mediciones sueltas de cualquiera deja de
 * ser comparable en el tiempo.
 *
 * Los pesos del indice los ve cualquiera, porque explican el numero que todos
 * leen; cambiarlos es del ADMINISTRADOR, porque mueve el indice de todos los
 * proyectos a la vez.
 *
 * Las rutas fijas van antes que /salud/:id, por la regla de siempre.
 */
import { Router } from 'express';

import {
  cambiarPesos,
  historico,
  pesos,
  salud,
  saludProyecto,
  snapshot,
} from '../controllers/metrica.controller.js';
import { requiereAutenticacion, requiereRol } from '../middlewares/autenticacion.js';

const router = Router();

router.use(requiereAutenticacion);

router.get('/salud', salud);
router.get('/historico', historico);
router.post('/snapshot', requiereRol('ADMINISTRADOR'), snapshot);
router.get('/pesos', pesos);
router.put('/pesos', requiereRol('ADMINISTRADOR'), cambiarPesos);

router.get('/salud/:id', saludProyecto);

export default router;
