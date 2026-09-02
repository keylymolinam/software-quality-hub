/**
 * Configuracion central de la aplicacion.
 *
 * Lee el archivo .env una sola vez y expone los valores ya validados.
 * El resto del codigo importa desde aqui y nunca lee process.env directamente:
 * asi hay un unico lugar donde saber que configuracion existe.
 */
import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  dbPath: process.env.DB_PATH || './data/software_quality_hub.sqlite',
};

export const isDevelopment = config.nodeEnv === 'development';
