/**
 * Entrar, quedarse dentro y salir.
 *
 * Las pruebas de tests/ sustituyen el contexto de sesion por un doble, asi que
 * nunca han visto funcionar el de verdad. Aqui se ejercita entero: el login
 * contra el backend, el token guardado que sobrevive a una recarga (el estado
 * `comprobando` de App.jsx) y el cierre que lo olvida.
 */
import { test, expect } from '@playwright/test';

import { USUARIOS, entrar } from './apoyo.js';

test('con credenciales incorrectas avisa y no deja entrar', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo electr\u00f3nico').fill(USUARIOS.administrador.correo);
  await page.getByLabel('Contrase\u00f1a').fill('NoEsLaClave1');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Se afirma sobre la clase y no sobre el texto: el mensaje lo redacta el
  // backend y reescribirlo no debe romper la prueba.
  await expect(page.locator('.alerta--error')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salir' })).toHaveCount(0);

  // El boton vuelve a estar disponible: el finally de Login.jsx lo reactiva
  // tambien cuando la peticion falla.
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled();
});

test('la sesion sobrevive a una recarga y se pierde al salir', async ({ page }) => {
  await entrar(page, USUARIOS.tester);

  const cabecera = page.locator('.lateral__usuario');
  await expect(cabecera).toContainText(USUARIOS.tester.nombre);
  await expect(cabecera).toContainText('TESTER');

  // Recargar no debe pedir la contrasena otra vez: el token guardado se valida
  // contra el backend y la aplicacion vuelve a abrir.
  await page.reload();
  await expect(cabecera).toContainText(USUARIOS.tester.nombre);

  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  // Y tras salir, recargar no la recupera: el token se borro de verdad.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});
