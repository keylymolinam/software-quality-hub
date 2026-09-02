/**
 * Rutas de estado del servicio.
 *
 * Un archivo de rutas solo asocia una URL + verbo HTTP con la funcion del
 * controlador que debe atenderla. No contiene logica.
 */
import { Router } from 'express';
import { obtenerEstado } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health
router.get('/', obtenerEstado);

export default router;
