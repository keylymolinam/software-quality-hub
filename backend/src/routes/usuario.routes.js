/**
 * Rutas de USUARIO.
 *
 *   Metodo  Direccion                       Quien puede
 *   ------  ------------------------------  ------------------------------
 *   GET     /api/usuarios                   cualquier sesion
 *   POST    /api/usuarios                   ADMINISTRADOR
 *   GET     /api/usuarios/:id               cualquier sesion
 *   PUT     /api/usuarios/:id               el propio usuario o ADMINISTRADOR
 *   PUT     /api/usuarios/:id/contrasena    SOLO el propio usuario
 *   DELETE  /api/usuarios/:id               ADMINISTRADOR
 *
 * Razones de cada permiso:
 *
 *   Leer es abierto a cualquier sesion porque hace falta para lo mas corriente
 *   del sistema: elegir a quien asignar una incidencia. El listado no expone
 *   nada sensible (el model nunca devuelve contrasena_hash).
 *
 *   Editar el propio perfil lo puede hacer cualquiera, pero el campo `rol`
 *   queda reservado a ADMINISTRADOR. Esa comprobacion NO puede vivir aqui,
 *   porque depende de que campos trae el cuerpo de la peticion y no de la
 *   direccion: esta en usuario.service.js.
 *
 *   Cambiar la contrasena es lo unico que ni siquiera un administrador puede
 *   hacer por otra persona: la operacion exige la contrasena actual, que solo
 *   su dueno conoce. Por eso requiereSerElMismoO() va sin roles.
 */
import { Router } from 'express';

import {
  listar,
  obtener,
  crear,
  actualizar,
  actualizarContrasena,
  eliminar,
} from '../controllers/usuario.controller.js';
import {
  requiereAutenticacion,
  requiereRol,
  requiereSerElMismoO,
} from '../middlewares/autenticacion.js';

const router = Router();

router.use(requiereAutenticacion);

const soloAdmin = requiereRol('ADMINISTRADOR');

// --- Coleccion ------------------------------------------------------------
router.get('/', listar);
router.post('/', soloAdmin, crear);

// --- Recurso individual ---------------------------------------------------
router.get('/:id', obtener);
router.put('/:id', requiereSerElMismoO('ADMINISTRADOR'), actualizar);
router.delete('/:id', soloAdmin, eliminar);

// --- Subrecursos ----------------------------------------------------------
router.put('/:id/contrasena', requiereSerElMismoO(), actualizarContrasena);

export default router;
