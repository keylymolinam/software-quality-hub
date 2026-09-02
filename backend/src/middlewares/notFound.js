/**
 * Middleware 404.
 *
 * Se ejecuta cuando ninguna ruta anterior respondio a la peticion,
 * es decir, cuando el cliente pidio una URL que no existe.
 */
export function notFound(req, res) {
  res.status(404).json({
    error: 'Recurso no encontrado',
    detalle: `La ruta ${req.method} ${req.originalUrl} no existe en esta API.`,
  });
}
