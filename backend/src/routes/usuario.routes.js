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
 *   PUT     /api/usuarios/:id/restablecer-contrasena
 *                                           ADMINISTRADOR, sobre otra cuenta
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
 *   Cambiar la contrasena exige la actual, que solo su dueno conoce. Por eso
 *   requiereSerElMismoO() va sin roles: un administrador no la cambia por esa
 *   via. Lo que si puede es restablecerla cuando su dueno la olvido, por una
 *   ruta aparte que no pide la vigente; por que se acepto esa excepcion esta
 *   en restablecerContrasena() de usuario.service.js.
 */
import { Router } from 'express';

import {
  listar,
  obtener,
  crear,
  actualizar,
  actualizarContrasena,
  restablecerContrasena,
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
router.put('/:id/restablecer-contrasena', soloAdmin, restablecerContrasena);

export default router;
