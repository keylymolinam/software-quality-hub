/**
 * Manejador central de errores.
 *
 * Express reconoce este middleware como manejador de errores porque recibe
 * cuatro parametros (err, req, res, next). Cualquier error lanzado en un
 * controlador o service termina aqui, de modo que:
 *   - el servidor nunca se cae por un error no controlado,
 *   - el cliente siempre recibe una respuesta JSON con el mismo formato.
 */
import { isDevelopment } from '../config/env.js';

// eslint-disable-next-line no-unused-vars -- Express exige los 4 parametros
export function errorHandler(err, req, res, next) {
  // Si el error trae un codigo HTTP propio lo usamos; si no, es un error interno.
  const status = err.status || err.statusCode || 500;

  // express.json() marca asi los cuerpos que no son JSON valido. Su mensaje
  // original es tecnico y viene en ingles ("Unexpected end of JSON input"),
  // lo que rompe la consistencia del resto de las respuestas de la API.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'El cuerpo de la peticion no es JSON valido.',
      detalles: [{ campo: 'body', mensaje: err.message }],
    });
  }

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    // Lista de problemas puntuales, cuando el error la trae (ver utils/errores.js).
    // Permite que el formulario del frontend marque cada campo equivocado.
    ...(err.detalles && { detalles: err.detalles }),
    // El detalle tecnico solo se expone en desarrollo, nunca en produccion.
    ...(isDevelopment && { stack: err.stack }),
  });
}
