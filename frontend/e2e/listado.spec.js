/**
 * El estado del listado vive en la direccion.
 *
 * CLAUDE.md promete tres cosas a cambio de guardar filtros y pagina en la
 * cadena de consulta en vez de en useState: enlaces que se comparten, el boton
 * atras deshaciendo el ultimo filtro y recargar sin perder el trabajo. Las tres
 * dependen del navegador, y aqui se comprueban las tres.
 */
import { test, expect } from '@playwright/test';

import { crearPorApi, entrar } from './apoyo.js';

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
    expect(texto).toBe('En desarrollo');
  }
});

test('desde un posible duplicado se llega al listado con todos los marcados', async ({ page, request }) => {
  // Dos textos casi iguales para que el detector marque el segundo, y un
  // tercero distinto que no debe aparecer en el resultado.
  const original = await crearPorApi(request, {
    titulo: 'La exportacion de reportes a planilla se corta a la mitad',
    descripcion: 'Al exportar el reporte mensual la planilla queda con la mitad de las filas.',
  });
  const repetida = await crearPorApi(request, {
    titulo: 'La exportacion de reportes a planilla se corta a la mitad',
    descripcion: 'Al exportar el reporte mensual, la planilla queda con la mitad de las filas.',
  });
  const distinta = await crearPorApi(request, {
    titulo: 'Cambiar el color del boton principal del formulario',
    descripcion: 'El tono actual se confunde con el fondo en monitores con poco contraste.',
  });
  expect(repetida.posible_duplicado_de).toBe(original.id_incidencia);

  await entrar(page);
  await page.goto(`/incidencias/${repetida.id_incidencia}`);
  await page.getByRole('link', { name: 'Ver todos los posibles duplicados' }).click();

  await expect(page).toHaveURL(/posible_duplicado=1/);
  await expect(filtro(page, 'Duplicados')).toHaveValue('1');

  // Cada fila trae una marca del detector, y la incidencia distinta no esta.
  const filas = page.locator('tbody tr');
  await expect(filas.first()).toBeVisible();
  for (const fila of await filas.all()) {
    await expect(fila.locator('.marca--duplicado').first()).toBeVisible();
  }
  await expect(page.locator('tbody')).not.toContainText(distinta.titulo);

  // Estan las dos mitades de la pareja: la marcada y la original. Los titulos
  // son iguales, asi que se distinguen por el enlace de cada fila.
  const tituloDe = (id) => page.locator(`tbody a.tabla__titulo[href="/incidencias/${id}"]`);
  await expect(tituloDe(repetida.id_incidencia)).toBeVisible();
  await expect(tituloDe(original.id_incidencia)).toBeVisible();

  // Y la marca de la original lleva a la marcada.
  await page
    .locator(`tbody a.marca--duplicado[href="/incidencias/${repetida.id_incidencia}"]`)
    .click();
  await expect(page).toHaveURL(new RegExp(`/incidencias/${repetida.id_incidencia}$`));
});

test('una tarjeta del resumen filtra por su estado, y pulsarla otra vez lo quita', async ({ page }) => {
  await entrar(page);
  await page.goto('/incidencias');

  const pendiente = page.locator('.resumen-estado--abierta');

  await pendiente.click();
  await expect(page).toHaveURL(/estado=ABIERTA/);
  await expect(pendiente).toHaveAttribute('aria-pressed', 'true');
  // Es el mismo filtro que el de la barra: los dos dicen lo mismo.
  await expect(filtro(page, 'Estado')).toHaveValue('ABIERTA');

  await pendiente.click();
  await expect(page).not.toHaveURL(/estado=/);
  await expect(pendiente).toHaveAttribute('aria-pressed', 'false');
});

test('el menu lleva a Incidencias, y el proyecto se elige con el filtro', async ({ page }) => {
  await entrar(page);
  await page.goto('/salud');

  // Sin vista elegida, el menu abre el tablero.
  await page.locator('.lateral__nav').getByRole('link', { name: 'Incidencias' }).click();
  await expect(page).toHaveURL(/\/tablero$/);

  await filtro(page, 'Proyecto').selectOption({ label: 'Aplicacion Movil de Terreno' });
  await expect(page).toHaveURL(/\/tablero\?id_proyecto=2/);

  // El proyecto sigue elegido al pasar a la lista.
  await page.locator('.vistas').getByRole('link', { name: 'Lista' }).click();
  await expect(page).toHaveURL(/\/incidencias\?id_proyecto=2/);
  await expect(filtro(page, 'Proyecto')).toHaveValue('2');
});
