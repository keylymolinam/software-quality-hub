/**
 * Rutas de autenticacion.
 *
 *   POST  /api/auth/login  iniciar sesion, devuelve un token
 *   GET   /api/auth/yo     datos de la sesion actual (requiere token)
 *
 * /login es publica por necesidad: es la puerta de entrada, no puede exigir
 * haber entrado. /yo lleva el middleware delante porque su respuesta depende
 * de quien pregunta.
 */
import { Router } from 'express';

import { login, yo } from '../controllers/auth.controller.js';
import { requiereAutenticacion } from '../middlewares/autenticacion.js';

const router = Router();

router.post('/login', login);
router.get('/yo', requiereAutenticacion, yo);

export default router;
