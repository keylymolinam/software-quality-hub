/**
 * Rutas de metricas.
 *
 *   Metodo  Direccion                    Quien puede
 *   ------  ---------------------------  ---------------------------
 *   GET     /api/metricas/salud          cualquier sesion
 *   GET     /api/metricas/salud/:id      cualquier sesion
 *   GET     /api/metricas/historico      cualquier sesion
 *   POST    /api/metricas/snapshot       ADMINISTRADOR
 *
 * Leer indicadores lo puede hacer cualquiera del equipo: para eso existen.
 * Guardar una fotografia queda reservado a ADMINISTRADOR porque escribe en la
 * serie historica, y una serie con mediciones sueltas de cualquiera deja de
 * ser comparable en el tiempo.
 *
 * Las rutas fijas van antes que /salud/:id, por la regla de siempre.
 */
import { Router } from 'express';

import { salud, saludProyecto, snapshot, historico } from '../controllers/metrica.controller.js';
import { requiereAutenticacion, requiereRol } from '../middlewares/autenticacion.js';

const router = Router();

router.use(requiereAutenticacion);

router.get('/salud', salud);
router.get('/historico', historico);
router.post('/snapshot', requiereRol('ADMINISTRADOR'), snapshot);

router.get('/salud/:id', saludProyecto);

export default router;
