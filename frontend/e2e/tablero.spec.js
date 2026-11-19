/**
 * El tablero accionado en un navegador: arrastrar tarjetas entre columnas.
 *
 * Las pruebas de pantallas ven las columnas y las tarjetas; estas las mueven.
 * Lo que solo se puede comprobar aqui es que el arrastre llegue al backend,
 * que una columna no permitida no acepte la tarjeta, que el rechazo pida su
 * motivo antes de enviar y que el menu "Mover a" sirva a quien no arrastra.
 */
import { test, expect } from '@playwright/test';

import { crearPorApi, entrar } from './apoyo.js';

const columna = (page, estado) => page.locator(`.columna[data-estado="${estado}"]`);
const tarjetaEn = (page, estado, titulo) =>
  columna(page, estado).locator('.tarjeta-incidencia', { hasText: titulo });

/**
 * Arrastra la tarjeta a la parte de arriba de la columna de destino.
 *
 * Las incidencias de estas pruebas se crean con prioridad ALTA para que queden
 * primeras en su columna (se ordenan por prioridad) y se sueltan arriba en la
 * de destino. Con las tarjetas que dejan las demas pruebas, el centro de una
 * columna puede quedar bajo el borde de la ventana, y desplazar la pagina en
 * medio de un arrastre lo interrumpe.
 */
const arrastrar = (page, titulo, desde, hasta) =>
  tarjetaEn(page, desde, titulo).dragTo(columna(page, hasta), { targetPosition: { x: 60, y: 24 } });

test.beforeEach(async ({ page }) => {
  await entrar(page);
});

test('arrastrar una tarjeta a una columna permitida le cambia el estado', async ({ page, request }) => {
  const { titulo } = await crearPorApi(request, {
    titulo: 'El calendario de turnos no respeta los feriados',
    descripcion: 'Los turnos se asignan en dias feriados como si fueran habiles.',
    prioridad: 'ALTA',
  });

  await page.goto('/tablero');
  await arrastrar(page, titulo, 'ABIERTA', 'EN_PROGRESO');

  await expect(tarjetaEn(page, 'EN_PROGRESO', titulo)).toBeVisible();
  await expect(tarjetaEn(page, 'ABIERTA', titulo)).toHaveCount(0);
  await expect(page.locator('.alerta--ok')).toBeVisible();

  // Persistio: no es solo la pantalla.
  await page.reload();
  await expect(tarjetaEn(page, 'EN_PROGRESO', titulo)).toBeVisible();
});

test('una columna no permitida no acepta la tarjeta', async ({ page, request }) => {
  const { titulo } = await crearPorApi(request, {
    titulo: 'La firma digital rechaza certificados vigentes',
    descripcion: 'Al firmar un contrato el sistema indica que el certificado vencio aunque esta vigente.',
    prioridad: 'ALTA',
  });

  await page.goto('/tablero');

  // De Pendiente no se puede saltar a Validada.
  await arrastrar(page, titulo, 'ABIERTA', 'VALIDADA');

  await expect(tarjetaEn(page, 'ABIERTA', titulo)).toBeVisible();
  await expect(tarjetaEn(page, 'VALIDADA', titulo)).toHaveCount(0);

  // Y la pantalla ni lo intento: no hay un 409 del servidor que mostrar. El
  // backend lo habria rechazado igual, pero soltar donde no se puede no debe
  // terminar en un mensaje de error.
  await expect(page.locator('.alerta--error')).toHaveCount(0);
});

test('soltar en Cerrada pide el motivo antes de enviar', async ({ page, request }) => {
  const { titulo } = await crearPorApi(request, {
    titulo: 'El boton imprimir del comprobante no hace nada',
    descripcion: 'En el comprobante de pago el boton de imprimir no abre el dialogo de impresion.',
    prioridad: 'ALTA',
  });

  await page.goto('/tablero');
  await arrastrar(page, titulo, 'ABIERTA', 'CERRADA');

  const cuadro = page.getByRole('dialog');
  await expect(cuadro).toBeVisible();

  // Sin motivo el navegador no deja enviar, y la tarjeta no se mueve.
  await cuadro.getByRole('button', { name: 'Cerrar sin resolver' }).click();
  await expect(cuadro).toBeVisible();
  await expect(tarjetaEn(page, 'ABIERTA', titulo)).toBeVisible();

  await cuadro.getByLabel('Motivo').fill('No se reproduce.');
  await cuadro.getByRole('button', { name: 'Cerrar sin resolver' }).click();

  await expect(cuadro).toHaveCount(0);
  await expect(tarjetaEn(page, 'CERRADA', titulo)).toBeVisible();
});

test('el menu Mover a sirve a quien no puede arrastrar', async ({ page, request }) => {
  const { titulo } = await crearPorApi(request, {
    titulo: 'Las notificaciones llegan duplicadas al correo',
    descripcion: 'Cada aviso de vencimiento llega dos veces a la bandeja de entrada del cliente.',
  });

  await page.goto('/tablero');

  const tarjeta = tarjetaEn(page, 'ABIERTA', titulo);
  await tarjeta.getByText('Mover a').click();
  await tarjeta.getByRole('button', { name: /Pasar a En desarrollo/ }).click();

  await expect(tarjetaEn(page, 'EN_PROGRESO', titulo)).toBeVisible();
});
