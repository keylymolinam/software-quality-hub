/**
 * Registro de una incidencia, con los dos diferenciadores a la vista.
 *
 * Lo que aqui se prueba solo existe con un servidor detras y alguien
 * escribiendo: la sugerencia que llega mientras se teclea, el aviso de
 * duplicado tras guardar y el error del backend que aparece junto al campo
 * que lo provoco.
 */
import { test, expect } from '@playwright/test';

import { entrar } from './apoyo.js';

const PROYECTO = 'Portal de Autoatencion';

test.beforeEach(async ({ page }) => {
  await entrar(page);
  await page.goto('/incidencias/nueva');
});

test('el motor sugiere mientras se escribe y se aparta si se elige a mano', async ({ page }) => {
  await page.getByLabel('T\u00edtulo').fill('Usuarios ven facturas de otros clientes');
  await page
    .getByLabel('Descripci\u00f3n')
    .fill('Una vulnerabilidad permite acceder sin permiso a datos ajenos cambiando el numero en la direccion.');

  // La sugerencia llega sola, tras la espera del hook, y trae su evidencia:
  // los terminos que la motivaron. Una sugerencia sin evidencia incumpliria el
  // criterio que comparten los tres diferenciadores.
  const panel = page.locator('.sugerencia');
  await expect(panel.locator('.sugerencia__rotulo')).toHaveText('Sugerencia del motor');
  await expect(panel.locator('.termino').first()).toBeVisible();

  // Elegidas las dos cosas, el motor no va a intervenir al guardar, y el panel
  // tiene que dejar de sugerir para no hacer creer lo contrario.
  await page.getByLabel('Categor\u00eda').selectOption('SEGURIDAD');
  await page.getByLabel('Prioridad').selectOption('ALTA');

  await expect(panel).toHaveClass(/sugerencia--inactiva/);
  await expect(panel.locator('.termino')).toHaveCount(0);
});

test('registra con la clasificacion en blanco y avisa del posible duplicado', async ({ page }) => {
  // Casi el mismo texto que la incidencia #1 del seed, contado con otras
  // palabras: el caso para el que existe el detector.
  await page.getByLabel('T\u00edtulo').fill('El portal no carga para ningun cliente');
  await page
    .getByLabel('Descripci\u00f3n')
    .fill('Al abrir la direccion del portal el navegador muestra un error 500. Afecta a todos los clientes y es urgente porque impide realizar pagos.');
  await page.getByLabel('Proyecto').selectOption({ label: PROYECTO });

  await page.getByRole('button', { name: 'Registrar incidencia' }).click();

  // No se navega: la confirmacion es donde se cuenta que decidio el motor y si
  // la incidencia podria estar repetida.
  await expect(page.locator('.confirmacion__rotulo')).toHaveText('Registrada');
  await expect(page.locator('.confirmacion')).toContainText('Deducida por el motor');

  // Avisa pero no impide: la incidencia ya existe y el aviso trae sus cifras.
  const aviso = page.locator('.aviso-duplicado');
  await expect(aviso).toBeVisible();
  await expect(aviso.locator('.aviso-duplicado__cifras dd')).toHaveCount(3);

  await page.getByRole('button', { name: 'Ver en el listado' }).click();
  await expect(page).toHaveURL(/\/incidencias$/);
});

test('el error del servidor aparece junto al campo y no borra lo escrito', async ({ page }) => {
  // Cuatro letras pasan el `required` del navegador pero no el minimo del
  // backend. Es la unica forma de ver el camino del 400 con detalles por campo
  // desde la pantalla, que es lo que ErrorApi.mensajeDe() existe para servir.
  const descripcion = 'La pantalla de pagos queda en blanco tras confirmar la tarjeta.';

  await page.getByLabel('T\u00edtulo').fill('Pago');
  await page.getByLabel('Descripci\u00f3n').fill(descripcion);
  await page.getByLabel('Proyecto').selectOption({ label: PROYECTO });

  await page.getByRole('button', { name: 'Registrar incidencia' }).click();

  const conError = page.locator('.campo--con-error');
  await expect(conError).toHaveCount(1);
  await expect(conError).toContainText('T\u00edtulo');

  // Lo escrito sigue ahi para corregirlo, y el boton vuelve a estar disponible.
  await expect(page.getByLabel('Descripci\u00f3n')).toHaveValue(descripcion);
  await expect(page.getByRole('button', { name: 'Registrar incidencia' })).toBeEnabled();
});
