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

/**
 * Clave de las columnas: la consulta que se envia (ya con "Mis incidencias"
 * traducido al id) y la version. Sin filtros, todos vacios.
 */
const claveTablero = (filtros = {}) =>
  `tablero-${JSON.stringify({
    busqueda: '',
    prioridad: '',
    categoria: '',
    id_proyecto: '',
    asignado_a: '',
    posible_duplicado: '',
    ...filtros,
  })}-0`;
const CLAVE = claveTablero();
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

// Cada respuesta trae la cuenta por estado, igual que en la lista.
const RESUMEN = { ABIERTA: 12, EN_PROGRESO: 63, RESUELTA: 1, VALIDADA: 0, CERRADA: 31 };

const columna = (estado, datos, total = datos.length) => ({
  estado,
  datos,
  paginacion: { total, pagina: 1, limite: 50, paginas: 1 },
  resumen_estados: RESUMEN,
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
    // El usuario de prueba es el 1: ?asignado_a=yo tiene que pedir las columnas
    // con asignado_a=1. Si no se tradujera, la clave seria otra y el escenario
    // no la tendria declarada.
    declararEscenario({
      [claveTablero({ asignado_a: '1' })]: COLUMNAS,
      [CLAVE_PROYECTOS]: PROYECTOS,
      [CLAVE_USUARIOS]: USUARIOS,
    });

    const html = await dibujarTablero('/tablero?asignado_a=yo');

    assert.match(html, /<option value="yo" selected="">Mis incidencias<\/option>/);
    assert.match(texto(columnaDe(html, 'EN_PROGRESO')), /El portal no carga/);
    // Y cada persona del equipo esta en la lista para elegirla.
    assert.match(html, /<option value="3">Desarrollador 1<\/option>/);
  });

  test('usa la barra de filtros de la lista, sin Estado ni orden', async () => {
    declararEscenario({
      [claveTablero({ id_proyecto: '1', prioridad: 'ALTA' })]: COLUMNAS,
      [CLAVE_PROYECTOS]: PROYECTOS,
      [CLAVE_USUARIOS]: USUARIOS,
    });

    const html = await dibujarTablero('/tablero?id_proyecto=1&prioridad=ALTA');
    const visible = texto(html);

    // Los filtros de la direccion llegan a la consulta (si no, la clave no
    // estaria declarada) y se ven elegidos en la barra.
    assert.match(visible, /Buscar/);
    assert.ok(html.includes('<option value="1" selected="">Portal de Autoatencion</option>'));
    assert.ok(html.includes('<option value="ALTA" selected="">'));
    // Cada columna ya es un estado, y las columnas van por prioridad.
    assert.doesNotMatch(visible, /Estado/);
    assert.doesNotMatch(visible, /Ordenar por/);
  });

  test('muestra las tarjetas por estado de la lista, solo como cifras', async () => {
    declararEscenario({ [CLAVE]: COLUMNAS, [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });

    const html = await dibujarTablero();
    const tarjetas = html.split('class="resumen-estados"')[1] ?? '';

    // Cerrada cuenta todas (31), aunque su columna muestre solo las recientes.
    assert.match(texto(tarjetas), /Pendiente\s*12/);
    assert.match(texto(tarjetas), /Cerrada\s*31/);
    // Van antes de la barra de filtros, como en la lista.
    assert.ok(html.indexOf('resumen-estados') < html.indexOf('class="filtros"'));
    // El total como en la lista: la suma de las tarjetas (12+63+1+0+31),
    // no la de las columnas, que en Cerrada traen solo las recientes.
    assert.match(texto(html), /107 incidencias/);
    assert.ok(html.indexOf('resumen-registros') < html.indexOf('class="tablero'));
    // En el tablero no filtran: no son botones.
    assert.equal((html.match(/resumen-estado--fijo/g) ?? []).length, 5);
    assert.doesNotMatch(html, /aria-pressed/);
  });

  test('cambiar de vista conserva los filtros y descarta lo que es solo de la lista', async () => {
    const { default: SelectorVista } = await cargar('/src/components/SelectorVista.jsx');

    const desdeLista = dibujar(SelectorVista, {
      ruta: '/incidencias?estado=ABIERTA&id_proyecto=2&ordenarPor=prioridad&pagina=3',
      propiedades: { vista: 'lista' },
    });
    // Al tablero: el proyecto sigue; estado, orden y pagina no aplican ahi.
    assert.ok(desdeLista.includes('href="/tablero?id_proyecto=2"'));
    // La activa es Lista, y Tablero va primero.
    const activa = desdeLista.split('aria-current="page"')[1].split('</a>')[0];
    assert.match(texto(activa), /Lista/);
    assert.ok(desdeLista.indexOf('>Tablero<') < desdeLista.indexOf('>Lista<'));
    // Cada opcion lleva su icono.
    assert.equal((desdeLista.match(/class="vistas__icono"/g) ?? []).length, 2);

    const desdeTablero = dibujar(SelectorVista, {
      ruta: '/tablero?id_proyecto=2&asignado_a=yo',
      propiedades: { vista: 'tablero' },
    });
    assert.ok(desdeTablero.includes('href="/incidencias?id_proyecto=2&amp;asignado_a=yo"'));
  });

  test('un error ofrece reintentar, y mientras carga lo dice', async () => {
    declararEscenario({ [CLAVE]: falla('El servidor no responde.', 503), [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });
    assert.match(texto(await dibujarTablero()), /Reintentar/);

    declararEscenario({ [CLAVE]: cargando(), [CLAVE_PROYECTOS]: PROYECTOS, [CLAVE_USUARIOS]: USUARIOS });
    assert.match(texto(await dibujarTablero()), /Cargando el tablero/);
  });
});
