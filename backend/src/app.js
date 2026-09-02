/**
 * Construccion de la aplicacion Express.
 *
 * Este archivo solo ARMA la aplicacion: registra middlewares y rutas.
 * No enciende el servidor (de eso se encarga server.js). Separarlo permite
 * importar la app en las pruebas automatizadas sin ocupar un puerto real.
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { config, isDevelopment } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// --- Middlewares globales -------------------------------------------------
// Se ejecutan en orden, uno tras otro, ANTES de llegar a las rutas.

// Permite que el frontend (otro puerto) consuma esta API.
app.use(cors({ origin: config.corsOrigin }));

// Convierte el cuerpo JSON de la peticion en un objeto JavaScript (req.body).
app.use(express.json());

// Registra en consola cada peticion recibida. Solo en desarrollo.
if (isDevelopment) {
  app.use(morgan('dev'));
}

// --- Rutas ----------------------------------------------------------------
app.use('/api', apiRoutes);

// --- Manejo de errores ----------------------------------------------------
// Siempre al final: solo se llega aqui si nada anterior respondio.
app.use(notFound);
app.use(errorHandler);

export default app;
