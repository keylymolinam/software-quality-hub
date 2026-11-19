/**
 * Pruebas de la pantalla del desglose del indice de salud.
 *
 * Van en su propio archivo y no en pantallas.test.js porque esta pantalla tiene
 * una pieza que las otras no: lee el ambito de la direccion. El entorno de
 * render se comparte.
 *
 * Lo que mas importa comprobar aqui es que la pantalla no afirme mas de lo que
 * sabe: con datos insuficientes no debe aparecer ninguna cifra, y el aporte de
 * cada componente (puntaje por peso) tiene que ser el que corresponde, porque
 * es el numero que explica el indice y se calcula en la interfaz.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { cargando, cargar, cerrarEntorno, declararEscenario, dibujar, falla, respondeCon, texto } from './entorno.js';

const CLAVE = 'salud-desglose';

const componentes = {
  antiguedad: {
    puntaje: 63.7,
    peso: 0.4,
    incidencias_abiertas: 9,
    antiguedad_promedio_dias: 32.7,
    antiguedad_maxima_dias: 78,
    limite_dias: 90,
  },
  reapertura: {
    puntaje: 72.2,
    peso: 0.35,
    incidencias_reabiertas: 1,
    incidencias_totales: 12,
    tasa: 0.083,
    limite: 0.3,
  },
  densidad: {
    puntaje: 91.9,
    peso: 0.25,
    concentracion: 0.081,
    categorias_con_carga: 5,
    de_un_total_de: 6,
    reparto: [
      { categoria: 'DISPONIBILIDAD', cantidad: 3 },
      { categoria: 'DATOS_INTEGRIDAD', cantidad: 2 },
      { categoria: 'SEGURIDAD', cantidad: 1 },
    ],
  },
};

const contexto = {
  por_estado: [
    { estado: 'ABIERTA', cantidad: 5 },
    { estado: 'CERRADA', cantidad: 3 },
  ],
  por_prioridad_abiertas: [{ prioridad: 'ALTA', cantidad: 5 }],
  tiempo_medio_resolucion_dias: 12,
  clasificacion_automatica: { total: 12, automaticas: 8, proporcion: 0.6666666666666666 },
  posibles_duplicados: 1,
};

const GLOBAL = {
  ambito: 'GLOBAL',
  id_proyecto: null,
  indice: 73.7,
  etiqueta: 'ATENCION',
  datos_suficientes: true,
  componentes,
  contexto,
};

const PROYECTO_CRITICO = {
  ...GLOBAL,
  ambito: 'PROYECTO_3',
  id_proyecto: 3,
  nombre: 'Aplicacion Movil de Terreno',
  indice: 55,
  etiqueta: 'CRITICO',
};

const PROYECTO_SIN_DATOS = {
  ambito: 'PROYECTO_4',
  id_proyecto: 4,
  nombre: 'Reportes Gerenciales',
  indice: 100,
  etiqueta: 'SIN_DATOS',
  datos_suficientes: false,
  componentes,
  contexto,
};

const RESPUESTA = respondeCon({
  global: GLOBAL,
  proyectos: [PROYECTO_CRITICO, PROYECTO_SIN_DATOS],
});

const dibujarSalud = async (ruta = '/salud') => {
  const { default: Salud } = await cargar('/src/pages/Salud.jsx');
  return dibujar(Salud, { ruta, patron: '/salud' });
};

after(cerrarEntorno);

describe('Pantalla del desglose del indice', () => {
  test('muestra el indice global y los tres componentes con su peso', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const html = await dibujarSalud();
    const visible = texto(html);

    assert.match(visible, /73\.7/);
    assert.match(visible, /Atenci\u00f3n/);

    // Los tres componentes, cada uno con su puntaje y su peso declarado.
    assert.equal((html.match(/class="componente"/g) || []).length, 3);
    assert.match(visible, /Antig\u00fcedad de lo abierto/);
    assert.match(visible, /Tasa de reapertura/);
    assert.match(visible, /Pesa 40%/);
    assert.match(visible, /Pesa 35%/);
    assert.match(visible, /Pesa 25%/);
  });

  test('el aporte de cada componente es puntaje por peso', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const visible = texto(await dibujarSalud());

    // 63.7 x 0.40 = 25.5 de 40 puntos posibles.
    assert.match(visible, /aporta 25\.5 de 40/);

    // 72.2 x 0.35 = 25.3 de 35.
    assert.match(visible, /aporta 25\.3 de 35/);

    // 91.9 x 0.25 = 23.0 de 25.
    assert.match(visible, /aporta 23\.0 de 25/);
  });

  test('la barra de cada componente mide su puntaje, no su peso', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const html = await dibujarSalud();
    const anchos = [...html.matchAll(/width:\s*([\d.]+)%/g)].map((m) => Number(m[1]));

    // Las tres primeras barras son los componentes, en orden.
    assert.equal(anchos[0], 63.7);
    assert.equal(anchos[1], 72.2);
    assert.equal(anchos[2], 91.9);
  });

  test('la evidencia de cada componente sale de los datos, no de un texto fijo', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const visible = texto(await dibujarSalud());

    assert.match(visible, /9 abiertas/);
    assert.match(visible, /32\.7 d\u00edas en promedio/);

    // La tasa se muestra como porcentaje.
    assert.match(visible, /1 de 12 reabiertas \(8%\)/);
  });

  test('las explicaciones viven en la guia, no en la pantalla', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const html = await dibujarSalud();
    const visible = texto(html);

    // La pantalla muestra datos y enlaza a la guia para el porque.
    assert.ok(html.includes('href="/salud/guia"'));
    assert.doesNotMatch(visible, /convenci\u00f3n declarada/);
    assert.doesNotMatch(visible, /parte del paisaje/);

    // Sin globos del navegador sobre las barras.
    assert.doesNotMatch(html, /class="barra"[^>]*title=/);
  });

  test('el reparto por categoria usa los nombres legibles y su cuenta', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const html = await dibujarSalud();
    const visible = texto(html);

    assert.equal((html.match(/class="distribucion__fila"/g) || []).length, 3);
    assert.match(visible, /Disponibilidad/);
    assert.match(visible, /Datos e integridad/);

    // Dice cuantas categorias quedaron sin carga, en vez de dibujarlas en cero.
    assert.match(visible, /Sin incidencias: 1 de 6 categor\u00edas/);
  });

  test('las fichas de contexto muestran las cifras que permiten interpretar el indice', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const visible = texto(await dibujarSalud());

    assert.match(visible, /12 d/);
    assert.match(visible, /67%/);
    assert.match(visible, /8 de 12 incidencias/);
    assert.match(visible, /Posibles duplicados/);
  });

  test('el ambito se lee de la direccion', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const visible = texto(await dibujarSalud('/salud?proyecto=3'));

    assert.match(visible, /Aplicacion Movil de Terreno/);
    assert.match(visible, /55/);
    assert.match(visible, /Cr\u00edtico/);
  });

  test('un proyecto inexistente en la direccion cae al global, no a una pantalla vacia', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const visible = texto(await dibujarSalud('/salud?proyecto=999'));

    assert.match(visible, /Todo el sistema/);
    assert.match(visible, /73\.7/);
  });

  test('sin datos suficientes no muestra ninguna cifra ni el desglose', async () => {
    declararEscenario({ [CLAVE]: RESPUESTA });

    const html = await dibujarSalud('/salud?proyecto=4');
    const visible = texto(html);

    assert.match(visible, /Sin datos/);
    assert.match(visible, /no hay nada que medir/);

    // Ni el 100 del backend, ni los componentes: con datos insuficientes el
    // numero no significa nada y el desglose no tiene nada que desglosar.
    assert.doesNotMatch(html, />100</);
    assert.doesNotMatch(html, /class="componente"/);
    assert.doesNotMatch(visible, /Pesa 40%/);
  });

  test('un error ofrece reintentar', async () => {
    declararEscenario({ [CLAVE]: falla('Error 500 al calcular el indice.', 500) });

    const visible = texto(await dibujarSalud());

    assert.match(visible, /al calcular el indice/);
    assert.match(visible, /Reintentar/);
  });

  test('mientras calcula lo dice', async () => {
    declararEscenario({ [CLAVE]: cargando() });

    assert.match(texto(await dibujarSalud()), /Calculando/);
  });
});

describe('Guia del indice', () => {
  /**
   * Los pesos y limites de la guia estan escritos a mano (ver GuiaSalud.jsx).
   * Esta prueba los lee del backend, que es quien calcula de verdad, y exige
   * que la guia diga lo mismo: si alguien cambia un peso alla y olvida la
   * guia, la guia estaria explicando un indice que ya no existe.
   */
  function parametrosDelBackend() {
    const fuente = readFileSync(
      fileURLToPath(new URL('../../backend/src/services/salud.service.js', import.meta.url)),
      'utf8'
    );

    const numero = (patron) => Number(fuente.match(patron)[1]);

    return {
      antiguedad: Math.round(numero(/antiguedad:\s*([\d.]+)/) * 100),
      reapertura: Math.round(numero(/reapertura:\s*([\d.]+)/) * 100),
      reparto: Math.round(numero(/densidad:\s*([\d.]+)/) * 100),
      limiteDias: numero(/LIMITE_ANTIGUEDAD_DIAS\s*=\s*(\d+)/),
      limiteReapertura: Math.round(numero(/LIMITE_REAPERTURA\s*=\s*([\d.]+)/) * 100),
      saludable: numero(/SALUDABLE:\s*(\d+)/),
      atencion: numero(/ATENCION:\s*(\d+)/),
    };
  }

  async function dibujarGuia() {
    const { default: GuiaSalud } = await cargar('/src/pages/GuiaSalud.jsx');
    return texto(dibujar(GuiaSalud));
  }

  test('explica que es, para que sirve, como se lee y como se calcula', async () => {
    const visible = await dibujarGuia();

    assert.match(visible, /1\. Qu\u00e9 es/);
    assert.match(visible, /2\. Para qu\u00e9 sirve/);
    assert.match(visible, /3\. C\u00f3mo se lee/);
    assert.match(visible, /4\. C\u00f3mo se calcula/);
    assert.match(visible, /Volver al \u00edndice de salud/);
  });

  test('los pesos, limites y umbrales coinciden con los del backend', async () => {
    const visible = await dibujarGuia();
    const p = parametrosDelBackend();

    assert.match(visible, new RegExp(`Antig\u00fcedad de lo abierto pesa ${p.antiguedad}%`));
    assert.match(visible, new RegExp(`Tasa de reapertura pesa ${p.reapertura}%`));
    assert.match(visible, new RegExp(`Reparto por categor\u00eda pesa ${p.reparto}%`));
    assert.match(visible, new RegExp(`${p.limiteDias} d\u00edas o m\u00e1s da 0`));
    assert.match(visible, new RegExp(`${p.limiteReapertura}% o m\u00e1s da 0`));
    assert.match(visible, new RegExp(`${p.saludable} o m\u00e1s`));
    assert.match(visible, new RegExp(`Menos de ${p.atencion}\.`));
  });

  test('el ejemplo suma bien: cada puntaje por su peso', async () => {
    const visible = await dibujarGuia();

    // 50 x 40% + 100 x 35% + 80 x 25% = 20 + 35 + 20 = 75
    assert.match(visible, /\u00cdndice 75/);
    assert.match(visible, /75 queda entre 60 y 79/);
  });
});
