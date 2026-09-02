/**
 * Enrutador principal de la API.
 *
 * Reune todos los grupos de rutas bajo el prefijo /api.
 * A medida que avance el proyecto se iran agregando aqui:
 *   usuarios, proyectos, incidencias, metricas.
 */
import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/health', healthRoutes);

export default router;
