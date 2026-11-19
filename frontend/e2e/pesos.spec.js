/**
 * Los pesos del indice cambiados de verdad, en un navegador.
 *
 * Las pruebas de pantallas dibujan la pagina con respuestas inventadas. Lo que
 * solo se comprueba aqui es el recorrido completo: que la suma en vivo impida
 * guardar mientras no cuadre, que el cambio llegue al backend, que quede en la
 * historia y que la guia ya explique los pesos nuevos.
 *
 * Ninguna otra prueba de esta suite depende del valor del indice, y la base de
 * estas pruebas se recarga con el seed antes de cada corrida, asi que cambiar
 * los pesos aqui no contamina nada.
 */
import { test, expect } from '@playwright/test';

import { entrar, USUARIOS } from './apoyo.js';

test('el administrador cambia los pesos y la guia los explica', async ({ page }) => {
  await entrar(page);
  await page.goto('/salud/pesos');

  await page.getByRole('button', { name: 'Cambiar pesos' }).click();

  const guardar = page.getByRole('button', { name: 'Guardar pesos' });

  // 50 + 30 + 10 = 90: no deja guardar y dice cuanto falta.
  await page.getByLabel('Antig\u00fcedad de lo abierto (%)').fill('50');
  await page.getByLabel('Tasa de reapertura (%)').fill('30');
  await page.getByLabel('Reparto por categor\u00eda (%)').fill('10');
  await expect(page.locator('.pesos__suma--mal')).toBeVisible();
  await expect(guardar).toBeDisabled();

  await page.getByLabel('Reparto por categor\u00eda (%)').fill('20');
  await expect(page.locator('.pesos__suma--ok')).toBeVisible();

  const motivo = 'Prueba de interaccion: mas peso a la antiguedad.';
  await page.getByLabel('Motivo del cambio').fill(motivo);
  await guardar.click();

  await expect(page.locator('.alerta--ok')).toBeVisible();
  await expect(page.locator('.tabla')).toContainText(motivo);

  // La guia ya no muestra los pesos iniciales.
  await page.goto('/salud/guia');
  await expect(page.getByText('pesa 50%')).toBeVisible();
});

test('quien no es administrador no ve como cambiarlos', async ({ page }) => {
  await entrar(page, USUARIOS.tester);
  await page.goto('/salud/pesos');

  await expect(page.getByRole('heading', { name: 'Pesos vigentes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cambiar pesos' })).toHaveCount(0);
});
