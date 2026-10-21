/**
 * El estado del listado vive en la direccion.
 *
 * CLAUDE.md promete tres cosas a cambio de guardar filtros y pagina en la
 * cadena de consulta en vez de en useState: enlaces que se comparten, el boton
 * atras deshaciendo el ultimo filtro y recargar sin perder el trabajo. Las tres
 * dependen del navegador, y aqui se comprueban las tres.
 */
import { test, expect } from '@playwright/test';

import { entrar } from './apoyo.js';

/**
 * El desplegable de un filtro, por el texto exacto de su etiqueta.
 *
 * getByLabel no alcanza: el nombre accesible de un select incluye el texto de
 * sus opciones, y "Ordenar por" ofrece "Estado" y "Prioridad".
 */
const filtro = (page, etiqueta) =>
  page
    .locator('.filtros label.campo')
    .filter({ has: page.locator('.campo__etiqueta', { hasText: new RegExp(`^${etiqueta}$`) }) })
    .locator('select');

test('los filtros van a la direccion, sobreviven a la recarga y se deshacen con atras', async ({ page }) => {
  await entrar(page);
  await page.goto('/incidencias');

  const estado = filtro(page, 'Estado');
  const prioridad = filtro(page, 'Prioridad');

  await estado.selectOption('CERRADA');
  await expect(page).toHaveURL(/estado=CERRADA/);

  await prioridad.selectOption('ALTA');
  await expect(page).toHaveURL(/estado=CERRADA/);
  await expect(page).toHaveURL(/prioridad=ALTA/);

  // Recargar conserva los dos filtros.
  await page.reload();
  await expect(estado).toHaveValue('CERRADA');
  await expect(prioridad).toHaveValue('ALTA');

  // Atras deshace solo el ultimo.
  await page.goBack();
  await expect(page).not.toHaveURL(/prioridad=/);
  await expect(estado).toHaveValue('CERRADA');
  await expect(prioridad).toHaveValue('');
});

test('un enlace con filtros abre el listado ya filtrado', async ({ page }) => {
  await entrar(page);
  await page.goto('/incidencias?estado=EN_PROGRESO');

  await expect(filtro(page, 'Estado')).toHaveValue('EN_PROGRESO');

  // Cada fila del resultado esta en el estado del filtro.
  const etiquetas = page.locator('tbody .etiqueta-estado');
  await expect(etiquetas.first()).toBeVisible();
  for (const texto of await etiquetas.allTextContents()) {
    expect(texto).toBe('En progreso');
  }
});
