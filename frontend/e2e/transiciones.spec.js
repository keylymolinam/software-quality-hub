/**
 * La maquina de estados accionada desde el detalle de una incidencia.
 *
 * Las pruebas de tests/ comprueban que el panel ofrece los botones correctos
 * para cada estado; estas los pulsan. Lo nuevo que se ve aqui es la
 * coordinacion entre piezas: que tras cada cambio la etiqueta, la fecha de
 * resolucion y la bitacora concuerden, y que el motivo obligatorio se haga
 * cumplir en las dos capas, la del navegador y la del servidor.
 */
import { test, expect } from '@playwright/test';

import { crearPorApi, entrar } from './apoyo.js';

/**
 * Elige una accion del panel, escribe el motivo si se da y confirma.
 *
 * Los dos botones llevan el mismo texto (el que elige y el que confirma), por
 * eso cada uno se busca dentro de su propia zona del panel.
 */
async function ejecutar(page, accion, motivo = null) {
  // exact: "Cerrar" no debe calzar con "Cerrar sin resolver".
  await page.locator('.acciones__botones').getByRole('button', { name: accion, exact: true }).click();

  const formulario = page.locator('.acciones__confirmacion');
  if (motivo) await formulario.getByLabel('Motivo').fill(motivo);
  await formulario.getByRole('button', { name: accion, exact: true }).click();
}

const estadoVisible = (page) => page.locator('.detalle__distintivos .etiqueta-estado');
const hitos = (page) => page.locator('.linea-tiempo .hito');
const fechaResolucion = (page) => page.locator('.detalle--texto dt', { hasText: 'Resuelta' });

test.beforeEach(async ({ page }) => {
  await entrar(page);
});

test('recorre el flujo completo, con reapertura, hasta el estado final', async ({ page, request }) => {
  const incidencia = await crearPorApi(request, {
    titulo: 'El reporte mensual exporta columnas desordenadas',
    descripcion: 'Al descargar el reporte en planilla las columnas de monto y fecha aparecen intercambiadas.',
    categoria: 'DATOS_INTEGRIDAD',
    prioridad: 'MEDIA',
  });

  await page.goto(`/incidencias/${incidencia.id_incidencia}`);
  await expect(estadoVisible(page)).toHaveText('Pendiente');

  await ejecutar(page, 'Pasar a En desarrollo', 'Lo reviso hoy.');
  await expect(estadoVisible(page)).toHaveText('En desarrollo');
  await expect(page.locator('.hito__comentario', { hasText: 'Lo reviso hoy.' })).toBeVisible();

  // La fecha de resolucion sigue al estado: aparece al resolver...
  await ejecutar(page, 'Marcar resuelta');
  await expect(estadoVisible(page)).toHaveText('Resuelta');
  await expect(fechaResolucion(page)).toBeVisible();

  // ...y se va al reabrir, que ademas queda marcado en la bitacora porque es
  // la fuente de la tasa de reapertura del indice de salud.
  await ejecutar(page, 'Reabrir');
  await expect(estadoVisible(page)).toHaveText('En desarrollo');
  await expect(fechaResolucion(page)).toHaveCount(0);
  await expect(page.locator('.marca--reapertura')).toBeVisible();

  await ejecutar(page, 'Marcar resuelta');

  // Lo resuelto no se cierra directo: primero lo valida QA.
  const botones = page.locator('.acciones__botones');
  await expect(botones.getByRole('button', { name: 'Cerrar', exact: true })).toHaveCount(0);

  await ejecutar(page, 'Validar');
  await expect(estadoVisible(page)).toHaveText('Validada');

  await ejecutar(page, 'Cerrar');
  await expect(estadoVisible(page)).toHaveText('Cerrada');

  // Estado final: no queda ningun boton, y se dice en vez de esconder la
  // seccion. Cada cambio dejo su linea: el registro y seis transiciones.
  await expect(page.locator('.acciones__botones')).toHaveCount(0);
  await expect(page.locator('.acciones')).toContainText('estado final');
  await expect(hitos(page)).toHaveCount(7);
});

test('cerrar sin resolver exige motivo en el navegador y en el servidor', async ({ page, request }) => {
  const incidencia = await crearPorApi(request, {
    titulo: 'El boton de ayuda abre una ventana vacia',
    descripcion: 'En la seccion de perfil el enlace de ayuda lleva a una ventana sin contenido.',
    categoria: 'USABILIDAD_INTERFAZ',
    prioridad: 'BAJA',
  });

  await page.goto(`/incidencias/${incidencia.id_incidencia}`);

  await page.locator('.acciones__botones').getByRole('button', { name: 'Cerrar sin resolver' }).click();

  const formulario = page.locator('.acciones__confirmacion');
  const motivo = formulario.getByLabel('Motivo');
  const confirmar = formulario.getByRole('button', { name: 'Cerrar sin resolver' });

  // Primera capa: el navegador no deja enviar el formulario vacio.
  await confirmar.click();
  expect(await motivo.evaluate((campo) => campo.validity.valueMissing)).toBe(true);
  await expect(estadoVisible(page)).toHaveText('Pendiente');

  // Segunda capa: sin el `required` el envio sale, y el servidor lo rechaza con
  // el detalle en el campo `comentario`, que la pantalla muestra junto al
  // motivo. Es lo que pasaria si ACCIONES_TRANSICION y el backend discreparan.
  await motivo.evaluate((campo) => campo.removeAttribute('required'));
  await confirmar.click();
  await expect(formulario.locator('.campo__error')).toBeVisible();
  await expect(estadoVisible(page)).toHaveText('Pendiente');
  await expect(hitos(page)).toHaveCount(1);

  await motivo.fill('No se reproduce en ningun navegador.');
  await confirmar.click();

  await expect(estadoVisible(page)).toHaveText('Cerrada');
  await expect(
    page.locator('.hito__comentario', { hasText: 'No se reproduce en ningun navegador.' })
  ).toBeVisible();
});

test('descartar el posible duplicado quita el aviso y no toca nada mas', async ({ page, request }) => {
  // Parecida a la incidencia #3 del seed, para que el detector la marque.
  const incidencia = await crearPorApi(request, {
    titulo: 'La busqueda de facturas tarda mas de treinta segundos',
    descripcion: 'Al filtrar facturas por rango de fechas la consulta demora mucho y a veces expira cuando el cliente tiene muchos documentos.',
  });
  expect(incidencia.posible_duplicado_de).not.toBeNull();

  await page.goto(`/incidencias/${incidencia.id_incidencia}`);

  const descartar = page.getByRole('button', { name: 'No es duplicado' });
  await descartar.click();
  await expect(descartar).toHaveCount(0);

  // Se confirma en verde que se quito, para que no parezca que no paso nada.
  await expect(page.locator('.alerta--ok')).toBeVisible();

  // La decision humana persiste: recargar no trae el aviso de vuelta. La
  // confirmacion tampoco vuelve: era la respuesta a pulsar, no un estado.
  await page.reload();
  await expect(page.getByRole('button', { name: 'No es duplicado' })).toHaveCount(0);
  await expect(page.locator('.alerta--ok')).toHaveCount(0);

  // Y lo demas sigue igual: el estado, y la marca de que la clasifico el motor.
  await expect(estadoVisible(page)).toHaveText('Pendiente');
  await expect(page.locator('.detalle--texto')).toContainText('Deducida por el motor');
});
