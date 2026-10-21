/**
 * Utilidades compartidas por las pruebas de interaccion.
 *
 * Dos formas de preparar el terreno, y cada una tiene su lugar:
 *
 *   - entrar() inicia sesion por la pantalla de login, como una persona. Es lo
 *     que se prueba, asi que no se esquiva.
 *   - crearPorApi() registra una incidencia directo contra el backend. Se usa
 *     cuando la incidencia es el punto de partida y no lo que se prueba: pasar
 *     por el formulario en cada prueba de transiciones las haria lentas y
 *     dependientes de una pantalla que ya tiene sus propias pruebas.
 *
 * Cada prueba crea sus propias incidencias en vez de usar las del seed. Asi el
 * orden de ejecucion no importa: ninguna depende de en que estado dejo otra a
 * la incidencia #3. Sus textos son distintos entre si a proposito: dos pruebas
 * con el mismo texto harian que el detector marcara a la segunda como
 * duplicado de la primera, y el aviso apareceria donde nadie lo espera.
 */
import { expect } from '@playwright/test';

import { API_URL } from '../playwright.config.js';

/** Los usuarios del seed comparten contrasena. */
export const CONTRASENA = 'Demo1234';

export const USUARIOS = {
  administrador: { correo: 'carolina.nunez@ejemplo.cl', nombre: 'Carolina Nunez' },
  tester: { correo: 'daniela.rojas@ejemplo.cl', nombre: 'Daniela Rojas' },
};

/** Inicia sesion por la pantalla de login y espera a estar dentro. */
export async function entrar(page, usuario = USUARIOS.administrador) {
  await page.goto('/');
  await page.getByLabel('Correo electr\u00f3nico').fill(usuario.correo);
  await page.getByLabel('Contrase\u00f1a').fill(CONTRASENA);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible();
}

/**
 * Registra una incidencia por la API y devuelve lo que respondio el backend.
 *
 * El autor sale del token, igual que en la aplicacion: el cuerpo no lleva
 * reportado_por porque el backend lo ignoraria.
 */
export async function crearPorApi(request, datos, usuario = USUARIOS.administrador) {
  const sesion = await request.post(`${API_URL}/auth/login`, {
    data: { correo_electronico: usuario.correo, contrasena: CONTRASENA },
  });
  expect(sesion.ok()).toBe(true);

  const { token } = await sesion.json();

  const respuesta = await request.post(`${API_URL}/incidencias`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { id_proyecto: 1, ...datos },
  });
  expect(respuesta.status()).toBe(201);

  return respuesta.json();
}
