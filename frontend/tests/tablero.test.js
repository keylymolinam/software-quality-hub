/**
 * Pruebas del tablero.
 *
 * Lo que se comprueba aqui es lo que se ve sin pulsar nada: una columna por
 * estado con su total, cada tarjeta en la columna que le corresponde, la nota
 * de los ultimos 30 dias en Cerrada y el aviso de que hay mas tarjetas de las
 * que caben. El arrastre y el menu "Mover a" necesitan un navegador; los cubre
 * e2e/tablero.spec.js.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';

import { cargando, cargar, cerrarEntorno, declararEscenario, dibujar, falla, respondeCon, texto } from './entorno.js';

// tablero-<proyecto>-<asignado>-<version>: sin filtros, los dos vacios.
const CLAVE = 'tablero---0';
const CLAVE_PROYECTOS = 'tablero-proyectos';
const CLAVE_USUARIOS = 'tablero-usuarios';

const tarjeta = (id, estado, titulo, extra = {}) => ({
  id_incidencia: id,
  titulo,
  estado,
  prioridad: 'MEDIA',
  asignado_a_nombre: null,
  posible_duplicado_de: null,
  duplicados_detectados: [],
  transiciones_posibles: [],
  ...extra,
});

const columna = (estado, datos, total = datos.length) => ({
  estado,
  datos,
  paginacion: { total, pagina: 1, limite: 50, paginas: 1 },
});

const COLUMNAS = respondeCon([
  columna('ABIERTA', [
    tarjeta(9, 'ABIERTA', 'La sincronizacion consume bateria', {
      transiciones_posibles: ['EN_PROGRESO', 'CERRADA'],
    }),
  ]),
  columna('EN_PROGRESO', [
    tarjeta(1, 'EN_PROGRESO', 'El portal no carga', {
      prioridad: 'ALTA',
      asignado_a_nombre: 'Desarrollador 1',
      transiciones_posibles: ['RESUELTA', 'CERRADA'],
    }),
  ], 63),
  columna('RESUELTA', [
    tarjeta(4, 'RESUELTA', 'Panel sin permisos', { transiciones_posibles: ['EN_PROGRESO', 'VALIDADA'] }),
  ]),
  columna('VALIDADA', []),
  columna('CERRADA', []),
]);

const PROYECTOS = respondeCon({ datos: [{ id_proyecto: 1, nombre: 'Portal de Autoatencion' }] });
const USUARIOS = respondeCon({ datos: [{ id_usuario: 3, nombre: 'Desarrollador 1' }] });

const dibujarTablero = async (ruta = '/tablero') => {
  const { default: Tablero } = await cargar('/src/pages/Tablero.jsx');
  return dibujar(Tablero, { ruta, patron: '/tablero' });
};

/** El HTML de una columna, para afirmar sobre lo que contiene. */
const columnaDe = (html, estado) => html.split('<section').find((s) => s.includes(`data-estado="${estado}"`)) ?? '';

after(cerrarEntorno);

describe('Tablero', () => {
  test('una columna por estado, en el orden del flujo y con su total', async () => {
    declararEscenario({ [CLAVE]: COLUMNAS, [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });

    const html = await dibujarTablero();
    const titulos = [...html.matchAll(/class="columna__titulo">([^<]+)</g)].map((m) => m[1]);

    assert.deepEqual(titulos, ['Pendiente', 'En desarrollo', 'Resuelta', 'Validada', 'Cerrada']);

    // El total es el del backend, no el de tarjetas dibujadas.
    assert.match(columnaDe(html, 'EN_PROGRESO'), /class="columna__total">63</);
  });

  test('cada tarjeta va en su columna, con lo justo para decidir', async () => {
    declararEscenario({ [CLAVE]: COLUMNAS, [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });

    const html = await dibujarTablero();
    const enDesarrollo = texto(columnaDe(html, 'EN_PROGRESO'));

    assert.match(enDesarrollo, /#1/);
    assert.match(enDesarrollo, /El portal no carga/);
    assert.match(enDesarrollo, /Desarrollador 1/);
    assert.match(texto(columnaDe(html, 'ABIERTA')), /Sin asignar/);
    assert.ok(columnaDe(html, 'RESUELTA').includes('href="/incidencias/4"'));
  });

  test('el menu de cada tarjeta ofrece solo lo que dice el backend', async () => {
    declararEscenario({ [CLAVE]: COLUMNAS, [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });

    const resuelta = texto(columnaDe(await dibujarTablero(), 'RESUELTA'));

    assert.match(resuelta, /Validar \u2192 Validada/);
    assert.match(resuelta, /Reabrir \u2192 En desarrollo/);
    assert.doesNotMatch(resuelta, /Cerrar/);
  });

  test('Cerrada muestra solo los ultimos 30 dias y enlaza a todas', async () => {
    declararEscenario({ [CLAVE]: COLUMNAS, [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });

    const cerrada = columnaDe(await dibujarTablero(), 'CERRADA');

    assert.match(texto(cerrada), /\u00daltimos 30 d\u00edas/);
    assert.ok(cerrada.includes('href="/incidencias?estado=CERRADA"'));
    assert.match(texto(cerrada), /Sin incidencias/);
  });

  test('si hay mas tarjetas de las que caben, lo dice y lleva al listado', async () => {
    declararEscenario({ [CLAVE]: COLUMNAS, [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });

    const enDesarrollo = columnaDe(await dibujarTablero(), 'EN_PROGRESO');

    assert.match(texto(enDesarrollo), /y 62 m\u00e1s en el listado/);
    assert.ok(enDesarrollo.includes('href="/incidencias?estado=EN_PROGRESO"'));
  });

  test('"Mis incidencias" pide las columnas de quien mira, no un id fijo', async () => {
    // El usuario de prueba es el 1: ?asignado=yo tiene que pedir las columnas
    // con asignado_a=1. Si no se tradujera, la clave seria otra y el escenario
    // no la tendria declarada.
    declararEscenario({
      'tablero--1-0': COLUMNAS,
      [CLAVE_PROYECTOS]: PROYECTOS,
      [CLAVE_USUARIOS]: USUARIOS,
    });

    const html = await dibujarTablero('/tablero?asignado=yo');

    assert.match(html, /<option value="yo" selected="">Mis incidencias<\/option>/);
    assert.match(texto(columnaDe(html, 'EN_PROGRESO')), /El portal no carga/);
    // Y cada persona del equipo esta en la lista para elegirla.
    assert.match(html, /<option value="3">Desarrollador 1<\/option>/);
  });

  test('un error ofrece reintentar, y mientras carga lo dice', async () => {
    declararEscenario({ [CLAVE]: falla('El servidor no responde.', 503), [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });
    assert.match(texto(await dibujarTablero()), /Reintentar/);

    declararEscenario({ [CLAVE]: cargando(), [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });
    assert.match(texto(await dibujarTablero()), /Cargando el tablero/);
  });
});
