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
 * Una opcion del menu de estado, por el nombre exacto de su accion. Se busca
 * por el rotulo y no por el nombre accesible del boton, que incluye tambien el
 * destino ("Validar -> Validada"); y exacto, para que "Cerrar" no calce con
 * "Cerrar sin resolver".
 */
const opcion = (page, accion) =>
  page
    .locator('.selector-estado__opcion')
    .filter({ has: page.locator('.selector-estado__accion', { hasText: new RegExp(`^${accion}$`) }) });

/** Abre el menu de la etiqueta de estado y elige una accion. */
async function elegir(page, accion) {
  await page.locator('.selector-estado__boton').click();
  await opcion(page, accion).click();
}

/**
 * Elige una accion del menu, escribe el motivo si se da y confirma.
 *
 * La opcion del menu y el boton que confirma llevan el mismo texto, por eso
 * el segundo se busca dentro del formulario de confirmacion.
 */
async function ejecutar(page, accion, motivo = null) {
  await elegir(page, accion);

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

  // Lo resuelto no se cierra directo: primero lo valida QA. Las opciones
  // estan en la pagina aunque el menu este cerrado, asi que se cuentan sin
  // abrirlo.
  await expect(opcion(page, 'Cerrar')).toHaveCount(0);

  await ejecutar(page, 'Validar');
  await expect(estadoVisible(page)).toHaveText('Validada');

  // La barra de progreso marca el paso en que va.
  await expect(page.locator('.progreso__paso[aria-current="step"]')).toHaveText('Validada');

  await ejecutar(page, 'Cerrar');
  await expect(estadoVisible(page)).toHaveText('Cerrada');

  // Estado final: no queda ningun menu, y se dice en vez de esconder la
  // seccion. Cada cambio dejo su linea: el registro y seis transiciones.
  await expect(page.locator('.selector-estado')).toHaveCount(0);
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

  await elegir(page, 'Cerrar sin resolver');

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
