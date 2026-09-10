/**
 * Rutas de INCIDENCIA.
 *
 * Un archivo de rutas es una tabla de contenidos: asocia cada combinacion de
 * verbo HTTP + direccion con la funcion del controlador que la atiende, y con
 * los middlewares que deben ejecutarse antes. No contiene logica, y esa
 * ausencia es deliberada: mirando solo este archivo se debe poder entender que
 * ofrece la API y quien puede usar cada cosa.
 *
 *   Metodo  Direccion                        Quien puede
 *   ------  -------------------------------  ---------------------------
 *   GET     /api/incidencias                 cualquier sesion
 *   POST    /api/incidencias                 cualquier sesion
 *   GET     /api/incidencias/:id             cualquier sesion
 *   PUT     /api/incidencias/:id             cualquier sesion
 *   DELETE  /api/incidencias/:id             ADMINISTRADOR
 *   POST    /api/incidencias/:id/transicion  cualquier sesion
 *   GET     /api/incidencias/:id/historial   cualquier sesion
 *   POST    /api/incidencias/clasificar      cualquier sesion
 *
 * Todas exigen sesion iniciada. Trabajar sobre incidencias es la tarea diaria
 * de cualquier rol del equipo, asi que no se restringen por rol; la excepcion
 * es eliminar, que destruye la incidencia y toda su bitacora (ON DELETE
 * CASCADE) y por tanto borra evidencia de trabajo realizado.
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
  clasificarTexto,
} from '../controllers/incidencia.controller.js';
import { requiereAutenticacion, requiereRol } from '../middlewares/autenticacion.js';

const router = Router();

// Se aplica a TODAS las rutas de este archivo. Escribirlo una vez evita el
// error mas caro posible aqui: agregar una ruta nueva y olvidar protegerla.
router.use(requiereAutenticacion);

// --- Coleccion ------------------------------------------------------------
router.get('/', listar);
router.post('/', crear);

// --- Herramientas ---------------------------------------------------------
// Va antes de las rutas con :id. Aunque POST /clasificar y POST /:id no
// chocarian hoy, mantener las rutas fijas arriba evita que una ruta futura
// quede capturada por el parametro.
router.post('/clasificar', clasificarTexto);

// --- Recurso individual ---------------------------------------------------
router.get('/:id', obtener);
router.put('/:id', actualizar);
router.delete('/:id', requiereRol('ADMINISTRADOR'), eliminar);

// --- Subrecursos ----------------------------------------------------------
router.post('/:id/transicion', transicionar);
router.get('/:id/historial', historial);

export default router;
