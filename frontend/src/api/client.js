/**
 * Cliente HTTP centralizado.
 *
 * Todas las llamadas al backend pasan por aqui. La ventaja de tener un unico
 * punto de entrada es que cuando haya que agregar algo comun a todas las
 * peticiones (por ejemplo el token de sesion del usuario), se cambia en un
 * solo archivo y no en cada pantalla.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });

  const datos = await respuesta.json().catch(() => null);

  // fetch NO lanza error con codigos 4xx/5xx, hay que revisarlo a mano.
  if (!respuesta.ok) {
    throw new Error(datos?.error || `Error ${respuesta.status} al llamar a ${ruta}`);
  }

  return datos;
}

export const api = {
  get: (ruta) => request(ruta),
  post: (ruta, cuerpo) =>
    request(ruta, { method: 'POST', body: JSON.stringify(cuerpo) }),
  put: (ruta, cuerpo) =>
    request(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) }),
  delete: (ruta) => request(ruta, { method: 'DELETE' }),
};
