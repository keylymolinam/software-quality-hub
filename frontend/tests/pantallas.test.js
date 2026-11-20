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

describe('Barra de filtros', () => {
  const SIN_FILTROS = {
    busqueda: '',
    estado: '',
    prioridad: '',
    categoria: '',
    id_proyecto: '',
    asignado_a: '',
    posible_duplicado: '',
    ordenarPor: 'fecha_creacion',
    direccion: 'DESC',
  };

  function dibujarFiltros(FiltrosIncidencias, valores) {
    return dibujar(FiltrosIncidencias, {
      propiedades: {
        valores,
        onCambiar: () => {},
        onLimpiar: () => {},
        proyectos: [],
        usuarios: [],
        hayFiltros: false,
      },
    });
  }

  test('a la vista solo estado, prioridad y proyecto; el resto tras "Mas filtros"', async () => {
    const { default: FiltrosIncidencias } = await cargar('/src/components/FiltrosIncidencias.jsx');

    const visible = texto(dibujarFiltros(FiltrosIncidencias, SIN_FILTROS));

    assert.match(visible, /Estado/);
    assert.match(visible, /Prioridad/);
    assert.match(visible, /Proyecto/);
    assert.match(visible, /\+ M\u00e1s filtros/);
    assert.doesNotMatch(visible, /\(\d\)/, 'sin filtros ocultos en uso no hay contador');

    // Las opciones "Estado" y "Prioridad" de "Ordenar por" no deben colarse:
    // se busca la etiqueta de cada desplegable oculto.
    assert.doesNotMatch(visible, /Categor\u00eda/);
    assert.doesNotMatch(visible, /Asignada a/);
    assert.doesNotMatch(visible, /Ordenar por/);
  });

  test('un filtro oculto en uso abre el panel y se cuenta en el boton', async () => {
    const { default: FiltrosIncidencias } = await cargar('/src/components/FiltrosIncidencias.jsx');

    const visible = texto(
      dibujarFiltros(FiltrosIncidencias, { ...SIN_FILTROS, categoria: 'SEGURIDAD', direccion: 'ASC' })
    );

    // Categoria y un orden distinto del de siempre: dos ocultos en uso.
    assert.match(visible, /Menos filtros \(2\)/);
    assert.match(visible, /Categor\u00eda/);
    assert.match(visible, /Ordenar por/);
  });

  test('el enlace a los posibles duplicados llega con el panel abierto', async () => {
    const { default: FiltrosIncidencias } = await cargar('/src/components/FiltrosIncidencias.jsx');

    const html = dibujarFiltros(FiltrosIncidencias, { ...SIN_FILTROS, posible_duplicado: '1' });

    assert.match(texto(html), /Menos filtros \(1\)/);
    // El desplegable muestra la opcion elegida, para que se sepa por que la
    // lista trae solo esas.
    assert.match(html, /<option value="1" selected="">Solo posibles duplicados<\/option>/);
  });
});

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

    assert.match(texto(html), /Pasar a En desarrollo/);
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

    assert.match(texto(desdeAbierta), /Pasar a En desarrollo/);
    assert.match(texto(desdeResuelta), /Reabrir/);
  });

  test('el paso de QA: lo resuelto se valida, y lo validado se cierra', async () => {
    const { default: PanelTransicion } = await cargar('/src/components/PanelTransicion.jsx');

    const resuelta = texto(
      dibujar(PanelTransicion, {
        propiedades: { ...comunes, estado: 'RESUELTA', transicionesPosibles: ['EN_PROGRESO', 'VALIDADA'] },
      })
    );
    const validada = texto(
      dibujar(PanelTransicion, {
        propiedades: { ...comunes, estado: 'VALIDADA', transicionesPosibles: ['CERRADA'] },
      })
    );

    assert.match(resuelta, /Validar/);
    assert.match(validada, /Cerrar/);
    assert.doesNotMatch(validada, /sin resolver/, 'cerrar lo validado no es un rechazo');
  });

  test('en desarrollo tambien se puede rechazar', async () => {
    const { default: PanelTransicion } = await cargar('/src/components/PanelTransicion.jsx');

    const visible = texto(
      dibujar(PanelTransicion, {
        propiedades: { ...comunes, estado: 'EN_PROGRESO', transicionesPosibles: ['RESUELTA', 'CERRADA'] },
      })
    );

    assert.match(visible, /Marcar resuelta/);
    assert.match(visible, /Cerrar sin resolver/);
  });

  test('los estados se muestran con los nombres del ciclo de vida del defecto', async () => {
    const { default: EtiquetaEstado } = await cargar('/src/components/EtiquetaEstado.jsx');

    const nombre = (estado) => texto(dibujar(EtiquetaEstado, { propiedades: { estado } }));

    assert.equal(nombre('ABIERTA'), 'Pendiente');
    assert.equal(nombre('EN_PROGRESO'), 'En desarrollo');
    assert.equal(nombre('VALIDADA'), 'Validada');
  });

  test('un estado final explica que no admite cambios', async () => {
    const { default: PanelTransicion } = await cargar('/src/components/PanelTransicion.jsx');

    const html = dibujar(PanelTransicion, {
      propiedades: { ...comunes, estado: 'CERRADA', transicionesPosibles: [] },
    });

    assert.match(texto(html), /estado final/);
    assert.doesNotMatch(html, /<button/);
  });

  test('las acciones van en un menu que parte cerrado y dice a donde lleva cada una', async () => {
    const { default: PanelTransicion } = await cargar('/src/components/PanelTransicion.jsx');

    const html = dibujar(PanelTransicion, {
      propiedades: { ...comunes, estado: 'RESUELTA', transicionesPosibles: ['EN_PROGRESO', 'VALIDADA'] },
    });

    // La etiqueta del estado actual abre el menu, que parte escondido.
    assert.match(html, /aria-haspopup="menu"/);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /<ul[^>]*role="menu"[^>]*hidden=""/);

    // Cada opcion nombra la accion y el estado de llegada.
    assert.match(texto(html), /Validar \u2192 Validada/);
    assert.match(texto(html), /Reabrir \u2192 En desarrollo/);
  });
});

describe('Barra de progreso', () => {
  async function pasos(estado, fechaResolucion = null) {
    const { default: ProgresoFlujo } = await cargar('/src/components/ProgresoFlujo.jsx');
    const html = dibujar(ProgresoFlujo, { propiedades: { estado, fechaResolucion } });

    return [...html.matchAll(/progreso__paso--(\w+)"[^>]*>.*?progreso__nombre">([^<]+)</g)].map(
      ([, situacion, nombre]) => `${nombre}:${situacion}`
    );
  }

  test('marca lo hecho, el paso actual y lo que falta', async () => {
    assert.deepEqual(await pasos('RESUELTA', '2026-11-01 10:00:00'), [
      'Pendiente:hecho',
      'En desarrollo:hecho',
      'Resuelta:actual',
      'Validada:pendiente',
      'Cerrada:pendiente',
    ]);
  });

  test('un rechazo no finge que paso por resolucion y validacion', async () => {
    const { default: ProgresoFlujo } = await cargar('/src/components/ProgresoFlujo.jsx');

    assert.deepEqual(await pasos('CERRADA', null), [
      'Pendiente:hecho',
      'En desarrollo:omitido',
      'Resuelta:omitido',
      'Validada:omitido',
      'Cerrada:rechazado',
    ]);

    const html = dibujar(ProgresoFlujo, { propiedades: { estado: 'CERRADA', fechaResolucion: null } });
    assert.match(texto(html), /sin resolver/);
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

    // Y el atajo al listado con todos los marcados por el detector.
    assert.ok(html.includes('href="/incidencias?posible_duplicado=1"'));

    // La decision humana cierra el ciclo del detector.
    assert.match(visible, /No es duplicado/);

    // Y se puede corregir lo que se escribio mal.
    assert.ok(html.includes('href="/incidencias/2/editar"'));
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
    assert.doesNotMatch(visible, /Pasar a En desarrollo/);

    // Sin marca de duplicado no hay nada que descartar.
    assert.doesNotMatch(visible, /No es duplicado/);
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

describe('Parejas de duplicados', () => {
  // La original de la pareja: no lleva marca propia, pero el backend le
  // informa quien se le parece.
  const ORIGINAL = {
    ...INCIDENCIA_DUPLICADA,
    id_incidencia: 1,
    posible_duplicado_de: null,
    clasificacion_automatica: 0,
    duplicados_detectados: [2],
  };

  test('la original avisa que tiene un duplicado y enlaza a el', async () => {
    const { default: DetalleIncidencia } = await cargar('/src/pages/DetalleIncidencia.jsx');

    declararEscenario(escenarioDetalle(ORIGINAL, historialDe([CREACION])));

    const html = dibujarDetalle(DetalleIncidencia, ORIGINAL);
    const visible = texto(html);

    assert.match(visible, /Tiene posibles duplicados/);
    assert.ok(html.includes('href="/incidencias/2"'), 'deberia enlazar a la marcada');
    assert.ok(html.includes('href="/incidencias?posible_duplicado=1"'));

    // La decision se toma en la marcada, no aqui.
    assert.doesNotMatch(visible, /No es duplicado/);
  });

  test('en el listado las dos marcas son enlaces a la otra mitad', async () => {
    const { default: TablaIncidencias } = await cargar('/src/components/TablaIncidencias.jsx');

    const html = dibujar(TablaIncidencias, {
      propiedades: {
        incidencias: [ORIGINAL, { ...INCIDENCIA_DUPLICADA, duplicados_detectados: [] }],
        hayFiltros: true,
      },
    });

    assert.match(html, /<a class="marca marca--duplicado" href="\/incidencias\/2"/);
    assert.match(html, /<a class="marca marca--duplicado" href="\/incidencias\/1"/);
    assert.match(texto(html), /Tiene un posible duplicado: #2/);
    assert.match(texto(html), /Posible duplicado de #1/);

    // Sin el globo del navegador: ninguna marca lleva title.
    assert.doesNotMatch(html, /class="marca[^"]*"[^>]*title=/);
  });
});

describe('Listado con resumen por estado', () => {
  const RESUMEN = { ABIERTA: 12, EN_PROGRESO: 7, RESUELTA: 4, VALIDADA: 2, CERRADA: 31 };

  // La clave con que la pantalla pide el listado sin filtros: JSON de los
  // valores por defecto de la direccion.
  const CLAVE_LISTADO = JSON.stringify({
    busqueda: '',
    estado: '',
    prioridad: '',
    categoria: '',
    id_proyecto: '',
    asignado_a: '',
    posible_duplicado: '',
    ordenarPor: 'fecha_creacion',
    direccion: 'DESC',
    pagina: '1',
  });

  test('las tarjetas muestran los cinco estados con su cuenta', async () => {
    const { default: ResumenEstados } = await cargar('/src/components/ResumenEstados.jsx');

    const html = dibujar(ResumenEstados, {
      propiedades: { resumen: RESUMEN, estadoActivo: 'EN_PROGRESO', onElegir: () => {} },
    });
    const visible = texto(html);

    assert.match(visible, /Pendiente\s*12/);
    assert.match(visible, /En desarrollo\s*7/);
    assert.match(visible, /Cerrada\s*31/);

    // Solo la del filtro puesto queda marcada como activa.
    assert.equal(html.match(/aria-pressed="true"/g).length, 1);
    assert.match(html, /resumen-estado--en_progreso resumen-estado--activo/);
  });

  test('la pantalla dibuja las tarjetas con lo que cuenta el backend', async () => {
    const { default: Incidencias } = await cargar('/src/pages/Incidencias.jsx');

    declararEscenario({
      [CLAVE_LISTADO]: respondeCon({
        datos: [INCIDENCIA_CERRADA],
        paginacion: { total: 1, pagina: 1, limite: 50, paginas: 1 },
        resumen_estados: RESUMEN,
      }),
      'referencias-de-filtro': respondeCon([{ datos: [] }, { datos: [] }]),
    });

    const visible = texto(dibujar(Incidencias, { ruta: '/incidencias' }));

    // 31 cerradas aunque la tabla traiga una sola fila: la cuenta es del
    // backend, no de la pagina recibida.
    assert.match(visible, /Cerrada\s*31/);
  });

  test('cada fila lleva franja de prioridad, iniciales y proyecto bajo el titulo', async () => {
    const { default: TablaIncidencias } = await cargar('/src/components/TablaIncidencias.jsx');

    const html = dibujar(TablaIncidencias, {
      propiedades: { incidencias: [INCIDENCIA_DUPLICADA, INCIDENCIA_CERRADA], hayFiltros: false },
    });
    const visible = texto(html);

    assert.match(html, /class="tabla__fila tabla__fila--alta"/);
    assert.match(html, /class="persona__avatar"[^>]*>JS</, 'Javiera Soto deberia verse como JS');
    assert.match(visible, /Portal de Clientes \u00b7 Disponibilidad/);

    // La fecha exacta sigue a la vista, bajo la relativa.
    assert.match(visible, /24-09-2026/);
  });

  test('la fecha relativa cuenta dias del calendario', async () => {
    const { haceCuanto } = await cargar('/src/dominio/incidencias.js');
    const ahora = new Date(2026, 10, 19, 10, 0);

    // Las fechas del backend van en UTC; se arman desde la hora local para que
    // la prueba no dependa de la zona del equipo.
    const utc = (...partes) => new Date(...partes).toISOString().slice(0, 19).replace('T', ' ');

    assert.equal(haceCuanto(utc(2026, 10, 19, 8, 0), ahora), 'hoy');
    assert.equal(haceCuanto(utc(2026, 10, 18, 23, 0), ahora), 'ayer');
    assert.equal(haceCuanto(utc(2026, 10, 16, 12, 0), ahora), 'hace 3 d\u00edas');
    assert.equal(haceCuanto(utc(2026, 10, 5, 12, 0), ahora), 'hace 2 semanas');
    assert.equal(haceCuanto(utc(2026, 7, 1, 12, 0), ahora), 'hace 3 meses');
    assert.equal(haceCuanto(utc(2024, 9, 1, 12, 0), ahora), 'hace 2 a\u00f1os');
  });
});

describe('Menu lateral por proyecto', () => {
  const PROYECTOS = respondeCon({
    datos: [
      { id_proyecto: 1, nombre: 'Portal de Autoatencion', estado: 'ACTIVO' },
      { id_proyecto: 2, nombre: 'Aplicacion Movil de Terreno', estado: 'ACTIVO' },
      { id_proyecto: 3, nombre: 'Migracion Sistema Legado', estado: 'FINALIZADO' },
      { id_proyecto: 4, nombre: 'Modulo de Reportes Gerenciales', estado: 'PAUSADO' },
    ],
    paginacion: { total: 4, pagina: 1, limite: 100, paginas: 1 },
  });

  async function dibujarMenu(ruta) {
    declararEscenario({ 'menu-proyectos-0': PROYECTOS });
    const { default: MenuLateral } = await cargar('/src/components/MenuLateral.jsx');
    return dibujar(MenuLateral, { ruta });
  }

  test('dentro de incidencias lista cada proyecto y marca el elegido', async () => {
    const html = await dibujarMenu('/incidencias?id_proyecto=2');
    const visible = texto(html);

    assert.match(html, /aria-expanded="true"/);
    assert.match(visible, /Todas/);
    assert.ok(html.includes('href="/incidencias?id_proyecto=1"'));
    assert.ok(html.includes('href="/incidencias?id_proyecto=4"'));

    // El proyecto de la direccion es el unico marcado.
    assert.match(
      html,
      /class="lateral__subenlace lateral__subenlace--activo" aria-current="page" href="\/incidencias\?id_proyecto=2"/
    );
    assert.equal(html.match(/aria-current="page"/g).length, 1);
  });

  test('los proyectos inactivos se atenuan y dicen su estado', async () => {
    const html = await dibujarMenu('/incidencias');

    assert.equal(html.match(/lateral__subenlace--inactivo/g).length, 2);
    assert.match(texto(html), /Migracion Sistema Legado Finalizado/);
    assert.match(texto(html), /Modulo de Reportes Gerenciales Pausado/);

    // Sin proyecto en la direccion, la marcada es "Todas".
    assert.match(html, /lateral__subenlace--activo" aria-current="page" href="\/incidencias"/);
  });

  test('fuera de incidencias el acordeon empieza cerrado', async () => {
    const html = await dibujarMenu('/salud');

    assert.match(html, /aria-expanded="false"/);
    assert.doesNotMatch(texto(html), /Portal de Autoatencion/);
  });

  test('el listado de un proyecto lo nombra bajo el titulo', async () => {
    const { default: Incidencias } = await cargar('/src/pages/Incidencias.jsx');

    declararEscenario({
      [JSON.stringify({
        busqueda: '',
        estado: '',
        prioridad: '',
        categoria: '',
        id_proyecto: '2',
        asignado_a: '',
        posible_duplicado: '',
        ordenarPor: 'fecha_creacion',
        direccion: 'DESC',
        pagina: '1',
      })]: respondeCon({
        datos: [],
        paginacion: { total: 0, pagina: 1, limite: 50, paginas: 1 },
        resumen_estados: { ABIERTA: 0, EN_PROGRESO: 0, RESUELTA: 0, VALIDADA: 0, CERRADA: 0 },
      }),
      'referencias-de-filtro': respondeCon([PROYECTOS.datos, { datos: [] }]),
    });

    const visible = texto(dibujar(Incidencias, { ruta: '/incidencias?id_proyecto=2' }));

    assert.match(visible, /Proyecto Aplicacion Movil de Terreno/);
  });
});

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

// --- Edicion de una incidencia ---------------------------------------------

describe('Pantalla de edicion', () => {
  const REFERENCIAS = respondeCon([
    { datos: [{ id_proyecto: 1, nombre: 'Portal de Clientes' }] },
    {
      datos: [
        { id_usuario: 2, nombre: 'Luis Fuentes', rol: 'DESARROLLADOR' },
        { id_usuario: 3, nombre: 'Daniela Rojas', rol: 'TESTER' },
      ],
    },
  ]);

  const escenarioEdicion = (incidencia) => ({
    ['editar-' + incidencia.id_incidencia]: respondeCon(incidencia),
    'referencias-edicion': REFERENCIAS,
  });

  const dibujarEdicion = (componente, incidencia) =>
    dibujar(componente, {
      ruta: '/incidencias/' + incidencia.id_incidencia + '/editar',
      patron: '/incidencias/:id/editar',
    });

  test('carga el formulario con los valores actuales', async () => {
    const { default: EditarIncidencia } = await cargar('/src/pages/EditarIncidencia.jsx');

    declararEscenario(escenarioEdicion(INCIDENCIA_DUPLICADA));

    const html = dibujarEdicion(EditarIncidencia, INCIDENCIA_DUPLICADA);

    assert.ok(html.includes('value="' + INCIDENCIA_DUPLICADA.titulo + '"'));
    assert.match(html, /El portal no carga para los usuarios/);

    // La categoria y la prioridad guardadas vienen seleccionadas.
    assert.ok(html.includes('selected') || html.includes('value="DISPONIBILIDAD"'));
  });

  test('no ofrece los campos que el sistema controla', async () => {
    const { default: EditarIncidencia } = await cargar('/src/pages/EditarIncidencia.jsx');

    declararEscenario(escenarioEdicion(INCIDENCIA_DUPLICADA));

    const html = dibujarEdicion(EditarIncidencia, INCIDENCIA_DUPLICADA);
    const visible = texto(html);

    // El estado se cambia con una transicion, y la pantalla lo explica en vez
    // de callarlo.
    assert.doesNotMatch(visible, /Estado\b.*Abierta/);
    assert.match(visible, /no se edita aqu\u00ed/);
    assert.match(visible, /transici\u00f3n/);
  });

  test('sin cambios el boton de guardar esta deshabilitado', async () => {
    const { default: EditarIncidencia } = await cargar('/src/pages/EditarIncidencia.jsx');

    declararEscenario(escenarioEdicion(INCIDENCIA_DUPLICADA));

    const html = dibujarEdicion(EditarIncidencia, INCIDENCIA_DUPLICADA);

    // Recien cargado no hay nada que guardar: un PUT vacio lo rechaza el
    // backend, y conviene decirlo antes de enviarlo.
    assert.match(html, /<button[^>]*type="submit"[^>]*disabled/);
  });

  test('una incidencia sin responsable carga el desplegable en sin asignar', async () => {
    const { default: EditarIncidencia } = await cargar('/src/pages/EditarIncidencia.jsx');

    declararEscenario(escenarioEdicion(INCIDENCIA_DUPLICADA));

    const visible = texto(dibujarEdicion(EditarIncidencia, INCIDENCIA_DUPLICADA));

    assert.match(visible, /Sin asignar/);
  });

  test('una incidencia que no existe lleva al listado', async () => {
    const { default: EditarIncidencia } = await cargar('/src/pages/EditarIncidencia.jsx');

    declararEscenario({
      'editar-999': falla('No existe la incidencia con id 999.', 404),
      'referencias-edicion': REFERENCIAS,
    });

    const visible = texto(
      dibujar(EditarIncidencia, {
        ruta: '/incidencias/999/editar',
        patron: '/incidencias/:id/editar',
      })
    );

    assert.match(visible, /No existe la incidencia con id 999/);
    assert.match(visible, /Volver al listado/);
  });
});
