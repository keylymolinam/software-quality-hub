/**
 * Pruebas de las pantallas de la interfaz.
 *
 * Dibujan cada pantalla en una situacion concreta y comprueban que diga lo que
 * corresponde. El valor esta sobre todo en las situaciones que cuesta
 * reproducir a mano y que son justo las que se rompen sin que nadie lo note:
 * una incidencia que no existe, un sistema sin datos suficientes para calcular
 * el indice, un estado final que no admite cambios.
 *
 * Se ejecutan con:  npm test   (desde frontend/)
 *
 * Lo que NO comprueban esta explicado en tests/entorno.js: ni aspecto, ni
 * interaccion, ni los efectos del hook de peticiones real. Una prueba que pulse
 * botones necesita un navegador, y eso es otra decision.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  cargando,
  cargar,
  cerrarEntorno,
  declararEscenario,
  dibujar,
  falla,
  respondeCon,
  texto,
} from './entorno.js';

// --- Datos de prueba -------------------------------------------------------

const INCIDENCIA_DUPLICADA = {
  id_incidencia: 2,
  titulo: 'El portal no carga para los usuarios',
  descripcion: 'Al ingresar al portal el navegador muestra error 500.',
  prioridad: 'ALTA',
  estado: 'ABIERTA',
  categoria: 'DISPONIBILIDAD',
  fecha_creacion: '2026-09-24 03:15:03',
  fecha_resolucion: null,
  clasificacion_automatica: 1,
  posible_duplicado_de: 1,
  proyecto_nombre: 'Portal de Clientes',
  reportado_por_nombre: 'Daniela Rojas',
  asignado_a_nombre: null,
  transiciones_posibles: ['EN_PROGRESO', 'CERRADA'],
};

const INCIDENCIA_CERRADA = {
  ...INCIDENCIA_DUPLICADA,
  id_incidencia: 5,
  titulo: 'El diseno no se adapta en pantallas pequenas',
  estado: 'CERRADA',
  categoria: 'USABILIDAD_INTERFAZ',
  fecha_resolucion: '2026-07-05 12:00:00',
  clasificacion_automatica: 0,
  posible_duplicado_de: null,
  asignado_a_nombre: 'Javiera Soto',
  transiciones_posibles: [],
};

const historialDe = (movimientos) => ({
  id_incidencia: 2,
  total: movimientos.length,
  movimientos,
});

const CREACION = {
  id_historial: 3,
  estado_anterior: null,
  estado_nuevo: 'ABIERTA',
  fecha_cambio: '2026-09-24 03:15:03',
  comentario: 'Registrada por QA.',
  modificado_por_nombre: 'Daniela Rojas',
};

const RESOLUCION = {
  id_historial: 5,
  estado_anterior: 'EN_PROGRESO',
  estado_nuevo: 'RESUELTA',
  fecha_cambio: '2026-09-28 18:30:00',
  comentario: null,
  modificado_por_nombre: 'Luis Fuentes',
};

const REAPERTURA = {
  id_historial: 7,
  estado_anterior: 'RESUELTA',
  estado_nuevo: 'EN_PROGRESO',
  fecha_cambio: '2026-09-29 09:05:00',
  comentario: 'Volvio a ocurrir en produccion.',
  modificado_por_nombre: 'Carolina Nunez',
};

/**
 * Escenario del detalle.
 *
 * Las claves son las que arma la pantalla. Si alguna vez cambian, el doble de
 * usePeticion falla diciendo exactamente cual falta, que es mejor que una
 * prueba que se cae mas adelante sin explicar por que.
 */
function escenarioDetalle(incidencia, historial) {
  const id = incidencia.id_incidencia;

  return {
    ['incidencia-' + id + '-0']: respondeCon(incidencia),
    ['historial-' + id + '-0']: respondeCon(historial),
  };
}

function dibujarDetalle(componente, incidencia) {
  return dibujar(componente, {
    ruta: '/incidencias/' + incidencia.id_incidencia,
    patron: '/incidencias/:id',
  });
}

after(cerrarEntorno);

// --- Linea de tiempo -------------------------------------------------------

describe('Linea de tiempo de la bitacora', () => {
  test('dibuja un hito por movimiento y nombra la creacion', async () => {
    const { default: LineaTiempo } = await cargar('/src/components/LineaTiempo.jsx');

    const html = dibujar(LineaTiempo, {
      propiedades: { movimientos: [CREACION, RESOLUCION, REAPERTURA] },
    });

    assert.equal((html.match(/<li class="hito/g) || []).length, 3);

    // El primer registro no tiene estado anterior: se nombra el acto en lugar
    // de dibujar una flecha que sale de la nada.
    assert.match(texto(html), /Registrada/);
    assert.match(texto(html), /Daniela Rojas/);
  });

  test('marca la reapertura y solo la reapertura', async () => {
    const { default: LineaTiempo } = await cargar('/src/components/LineaTiempo.jsx');

    const html = dibujar(LineaTiempo, {
      propiedades: { movimientos: [CREACION, RESOLUCION, REAPERTURA] },
    });

    assert.equal((html.match(/hito--reapertura/g) || []).length, 1);
    assert.equal((html.match(/marca--reapertura/g) || []).length, 1);
  });

  test('un comentario ausente no deja texto de relleno', async () => {
    const { default: LineaTiempo } = await cargar('/src/components/LineaTiempo.jsx');

    const html = dibujar(LineaTiempo, { propiedades: { movimientos: [RESOLUCION] } });

    assert.doesNotMatch(texto(html), /sin comentario/i);
  });

  test('sin movimientos lo dice en vez de quedar en blanco', async () => {
    const { default: LineaTiempo } = await cargar('/src/components/LineaTiempo.jsx');

    const html = dibujar(LineaTiempo, { propiedades: { movimientos: [] } });

    assert.match(texto(html), /no tiene movimientos registrados/);
  });
});

// --- Panel de transiciones -------------------------------------------------

describe('Panel de transiciones', () => {
  const comunes = { onEjecutar: async () => true, enviando: false, error: null };

  test('ofrece un boton por transicion posible, con su nombre propio', async () => {
    const { default: PanelTransicion } = await cargar('/src/components/PanelTransicion.jsx');

    const html = dibujar(PanelTransicion, {
      propiedades: {
        ...comunes,
        estado: 'ABIERTA',
        transicionesPosibles: ['EN_PROGRESO', 'CERRADA'],
      },
    });

    assert.match(texto(html), /Tomar y empezar/);
    assert.match(texto(html), /Cerrar sin resolver/);
  });

  test('el mismo destino se nombra distinto segun el origen', async () => {
    const { default: PanelTransicion } = await cargar('/src/components/PanelTransicion.jsx');

    const desdeAbierta = dibujar(PanelTransicion, {
      propiedades: { ...comunes, estado: 'ABIERTA', transicionesPosibles: ['EN_PROGRESO'] },
    });
    const desdeResuelta = dibujar(PanelTransicion, {
      propiedades: { ...comunes, estado: 'RESUELTA', transicionesPosibles: ['EN_PROGRESO'] },
    });

    assert.match(texto(desdeAbierta), /Tomar y empezar/);
    assert.match(texto(desdeResuelta), /Reabrir/);
  });

  test('un estado final explica que no admite cambios', async () => {
    const { default: PanelTransicion } = await cargar('/src/components/PanelTransicion.jsx');

    const html = dibujar(PanelTransicion, {
      propiedades: { ...comunes, estado: 'CERRADA', transicionesPosibles: [] },
    });

    assert.match(texto(html), /estado final/);
    assert.doesNotMatch(html, /<button/);
  });
});

// --- Detalle de incidencia -------------------------------------------------

describe('Pantalla de detalle', () => {
  test('muestra los datos y lo que aportaron los diferenciadores', async () => {
    const { default: DetalleIncidencia } = await cargar('/src/pages/DetalleIncidencia.jsx');

    declararEscenario(escenarioDetalle(INCIDENCIA_DUPLICADA, historialDe([CREACION])));

    const html = dibujarDetalle(DetalleIncidencia, INCIDENCIA_DUPLICADA);
    const visible = texto(html);

    assert.match(visible, /El portal no carga para los usuarios/);
    assert.match(visible, /Portal de Clientes/);
    assert.match(visible, /Daniela Rojas/);

    // Una incidencia sin responsable lo dice; no deja la celda en blanco.
    assert.match(visible, /Sin asignar/);

    // Los dos avisos de los diferenciadores, con el enlace a la original.
    assert.match(visible, /Posible duplicado/);
    assert.ok(html.includes('href="/incidencias/1"'));
    assert.match(visible, /dedujo el motor de clasificaci\u00f3n/);
  });

  test('no inventa una fila de resolucion cuando no hay fecha', async () => {
    const { default: DetalleIncidencia } = await cargar('/src/pages/DetalleIncidencia.jsx');

    declararEscenario(escenarioDetalle(INCIDENCIA_DUPLICADA, historialDe([CREACION])));
    const abierta = dibujarDetalle(DetalleIncidencia, INCIDENCIA_DUPLICADA);

    declararEscenario(escenarioDetalle(INCIDENCIA_CERRADA, historialDe([CREACION])));
    const cerrada = dibujarDetalle(DetalleIncidencia, INCIDENCIA_CERRADA);

    assert.ok(!abierta.includes('<dt>Resuelta'));
    assert.ok(cerrada.includes('<dt>Resuelta'));
  });

  test('una incidencia cerrada no ofrece transiciones', async () => {
    const { default: DetalleIncidencia } = await cargar('/src/pages/DetalleIncidencia.jsx');

    declararEscenario(escenarioDetalle(INCIDENCIA_CERRADA, historialDe([CREACION])));

    const visible = texto(dibujarDetalle(DetalleIncidencia, INCIDENCIA_CERRADA));

    assert.match(visible, /estado final/);
    assert.doesNotMatch(visible, /Tomar y empezar/);
  });

  test('una incidencia inexistente lleva al listado, no a reintentar', async () => {
    const { default: DetalleIncidencia } = await cargar('/src/pages/DetalleIncidencia.jsx');

    declararEscenario({
      'incidencia-999-0': falla('No existe la incidencia con id 999.', 404),
      'historial-999-0': falla('No existe la incidencia con id 999.', 404),
    });

    const visible = texto(
      dibujar(DetalleIncidencia, { ruta: '/incidencias/999', patron: '/incidencias/:id' })
    );

    assert.match(visible, /No existe la incidencia con id 999/);
    assert.match(visible, /Volver al listado/);

    // Reintentar un 404 volveria a fallar igual: no se ofrece.
    assert.doesNotMatch(visible, /Reintentar/);
  });

  test('un error pasajero si ofrece reintentar', async () => {
    const { default: DetalleIncidencia } = await cargar('/src/pages/DetalleIncidencia.jsx');

    declararEscenario({
      'incidencia-2-0': falla('No se pudo conectar con el servidor.', 0),
      'historial-2-0': falla('No se pudo conectar con el servidor.', 0),
    });

    const visible = texto(dibujarDetalle(DetalleIncidencia, INCIDENCIA_DUPLICADA));

    assert.match(visible, /Reintentar/);
  });
});

// --- Pantalla de inicio ----------------------------------------------------

describe('Pantalla de inicio', () => {
  const ESTADO_API = respondeCon({
    servicio: 'Software Quality Hub API',
    entorno: 'development',
    baseDatos: { registros: { incidencias: 12, proyectos: 4, usuarios: 5 } },
  });

  const SALUD = respondeCon({
    global: { indice: 74.2, etiqueta: 'ATENCION', datos_suficientes: true },
    proyectos: [
      {
        id_proyecto: 3,
        nombre: 'Aplicacion Movil',
        indice: 55,
        etiqueta: 'CRITICO',
        datos_suficientes: true,
      },
      {
        id_proyecto: 1,
        nombre: 'Portal de Clientes',
        indice: 81,
        etiqueta: 'SALUDABLE',
        datos_suficientes: true,
      },
      {
        id_proyecto: 4,
        nombre: 'Reportes Gerenciales',
        indice: 100,
        etiqueta: 'SIN_DATOS',
        datos_suficientes: false,
      },
    ],
  });

  test('muestra el indice global y el desglose por proyecto', async () => {
    const { default: Inicio } = await cargar('/src/pages/Inicio.jsx');

    declararEscenario({ 'estado-api': ESTADO_API, 'salud-global': SALUD });

    const html = dibujar(Inicio);
    const visible = texto(html);

    assert.match(visible, /74\.2/);

    // Las etiquetas se traducen: el identificador del backend no se muestra.
    assert.match(visible, /Atenci\u00f3n/);
    assert.doesNotMatch(html, />ATENCION</);

    assert.equal((html.match(/class="salud-proyecto"/g) || []).length, 3);

    // El orden que manda el backend, peor primero, no se altera.
    assert.ok(html.indexOf('Aplicacion Movil') < html.indexOf('Portal de Clientes'));

    // El proyecto sin datos no muestra su 100.
    assert.doesNotMatch(html, />100</);
  });

  test('sin datos suficientes no muestra ningun numero', async () => {
    const { default: Inicio } = await cargar('/src/pages/Inicio.jsx');

    declararEscenario({
      'estado-api': ESTADO_API,
      'salud-global': respondeCon({
        global: { indice: 100, etiqueta: 'SIN_DATOS', datos_suficientes: false },
        proyectos: [],
      }),
    });

    const html = dibujar(Inicio);

    assert.doesNotMatch(html, />100</);
    assert.match(texto(html), /Sin datos/);
    assert.match(texto(html), /Todav\u00eda no hay suficientes incidencias/);
  });

  test('si falla el indice, la tarjeta de conexion sigue a la vista', async () => {
    const { default: Inicio } = await cargar('/src/pages/Inicio.jsx');

    declararEscenario({
      'estado-api': ESTADO_API,
      'salud-global': falla('Error 500 al calcular el indice.', 500),
    });

    const visible = texto(dibujar(Inicio));

    assert.match(visible, /al calcular el indice/);

    // Esto es lo que motiva que las dos peticiones sean independientes: el
    // diagnostico de la conexion no puede desaparecer porque falle otra cosa.
    assert.match(visible, /API conectada/);
  });

  test('con el backend apagado cada tarjeta avisa por su cuenta', async () => {
    const { default: Inicio } = await cargar('/src/pages/Inicio.jsx');

    const caido = falla('No se pudo conectar con el servidor.', 0);
    declararEscenario({ 'estado-api': caido, 'salud-global': caido });

    const html = dibujar(Inicio);

    assert.equal((html.match(/No se pudo conectar/g) || []).length, 2);
    assert.equal((html.match(/Reintentar/g) || []).length, 2);
  });

  test('mientras espera lo dice en las dos tarjetas', async () => {
    const { default: Inicio } = await cargar('/src/pages/Inicio.jsx');

    declararEscenario({ 'estado-api': cargando(), 'salud-global': cargando() });

    const visible = texto(dibujar(Inicio));

    assert.match(visible, /Calculando/);
    assert.match(visible, /Verificando/);
  });
});
