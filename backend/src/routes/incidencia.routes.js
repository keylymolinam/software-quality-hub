/**
 * Rutas de INCIDENCIA.
 *
 * Un archivo de rutas es una tabla de contenidos: asocia cada combinacion de
 * verbo HTTP + direccion con la funcion del controlador que la atiende. No
 * contiene logica, y esa ausencia es deliberada: mirando solo este archivo se
 * debe poder entender que ofrece la API.
 *
 * Las direcciones son relativas. El prefijo /api/incidencias se agrega en
 * routes/index.js, de modo que mover todo el grupo a otra direccion sea
 * cambiar una sola linea.
 *
 *   GET     /api/incidencias                 listado con filtros y paginacion
 *   POST    /api/incidencias                 crear
 *   GET     /api/incidencias/:id             ver una
 *   PUT     /api/incidencias/:id             actualizar (parcial)
 *   DELETE  /api/incidencias/:id             eliminar
 *   POST    /api/incidencias/:id/transicion  cambiar de estado
 *   GET     /api/incidencias/:id/historial   bitacora de cambios
 *
 * Sobre el orden: Express evalua las rutas de arriba hacia abajo y se queda
 * con la primera que calza. Por eso las rutas fijas van siempre ANTES que las
 * que llevan parametro. Si mas adelante se agrega /api/incidencias/resumen,
 * debe ir sobre /:id; si quedara debajo, Express interpretaria "resumen" como
 * un valor del parametro id y nunca se alcanzaria.
 */
import { Router } from 'express';

import {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  transicionar,
  historial,
} from '../controllers/incidencia.controller.js';

const router = Router();

// --- Coleccion ------------------------------------------------------------
router.get('/', listar);
router.post('/', crear);

// --- Recurso individual ---------------------------------------------------
router.get('/:id', obtener);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

// --- Subrecursos ----------------------------------------------------------
router.post('/:id/transicion', transicionar);
router.get('/:id/historial', historial);

export default router;
