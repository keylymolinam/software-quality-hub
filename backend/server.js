/**
 * Punto de entrada del backend.
 *
 * Unica responsabilidad: tomar la aplicacion ya construida y ponerla a
 * escuchar peticiones en un puerto.
 */
import app from './src/app.js';
import { config } from './src/config/env.js';

app.listen(config.port, () => {
  console.log('');
  console.log('  Software Quality Hub - API');
  console.log(`  Escuchando en:  http://localhost:${config.port}`);
  console.log(`  Estado:         http://localhost:${config.port}/api/health`);
  console.log(`  Entorno:        ${config.nodeEnv}`);
  console.log('');
});
