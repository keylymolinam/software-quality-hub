/**
 * Enrutador principal de la API.
 *
 * Reune todos los grupos de rutas bajo el prefijo /api.
 * A medida que avance el proyecto se iran agregando aqui:
 *   usuarios, proyectos, incidencias, metricas.
 */
import { Router } from 'express';
import healthRoutes from './health.routes.js';
import incidenciaRoutes from './incidencia.routes.js';
import proyectoRoutes from './proyecto.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/incidencias', incidenciaRoutes);
router.use('/proyectos', proyectoRoutes);

export default router;
