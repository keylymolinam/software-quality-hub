/**
 * Rutas de PROYECTO.
 *
 *   GET     /api/proyectos        listado con filtros y paginacion
 *   POST    /api/proyectos        crear
 *   GET     /api/proyectos/:id    ver uno, con recuento de incidencias
 *   PUT     /api/proyectos/:id    actualizar (parcial)
 *   DELETE  /api/proyectos/:id    eliminar (409 si tiene incidencias)
 *
 * No hay ruta de transicion de estado como en incidencias: el estado de un
 * proyecto (ACTIVO / FINALIZADO / PAUSADO) no sigue ningun flujo obligatorio,
 * asi que se edita con el PUT normal.
 */
import { Router } from 'express';

import {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
} from '../controllers/proyecto.controller.js';

const router = Router();

// --- Coleccion ------------------------------------------------------------
router.get('/', listar);
router.post('/', crear);

// --- Recurso individual ---------------------------------------------------
router.get('/:id', obtener);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

export default router;
