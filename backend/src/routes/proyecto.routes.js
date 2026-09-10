/**
 * Rutas de PROYECTO.
 *
 *   Metodo  Direccion             Quien puede
 *   ------  --------------------  ---------------------------
 *   GET     /api/proyectos        cualquier sesion
 *   POST    /api/proyectos        ADMINISTRADOR
 *   GET     /api/proyectos/:id    cualquier sesion
 *   PUT     /api/proyectos/:id    ADMINISTRADOR
 *   DELETE  /api/proyectos/:id    ADMINISTRADOR
 *
 * Los proyectos son la estructura sobre la que trabaja todo el equipo: quien
 * los crea, renombra o da por finalizados toma una decision que afecta a todos.
 * Por eso escribir queda reservado a ADMINISTRADOR, mientras que leer lo
 * necesita cualquiera para poder registrar incidencias.
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
import { requiereAutenticacion, requiereRol } from '../middlewares/autenticacion.js';

const router = Router();

router.use(requiereAutenticacion);

const soloAdmin = requiereRol('ADMINISTRADOR');

// --- Coleccion ------------------------------------------------------------
router.get('/', listar);
router.post('/', soloAdmin, crear);

// --- Recurso individual ---------------------------------------------------
router.get('/:id', obtener);
router.put('/:id', soloAdmin, actualizar);
router.delete('/:id', soloAdmin, eliminar);

export default router;
