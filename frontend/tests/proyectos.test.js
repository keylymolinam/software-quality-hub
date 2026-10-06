/**
 * Pruebas de la pantalla de proyectos.
 *
 * Lo que mas importa aqui es el reparto por rol: la pantalla es una sola para
 * todos, y las acciones de administracion tienen que aparecer solo para quien
 * puede usarlas. Ofrecerle a un TESTER un boton que va a responder 403 es el
 * defecto que estas pruebas vigilan.
 *
 * El segundo foco es el borrado: el listado ya trae el conteo de incidencias,
 * asi que la pantalla puede decir que no se va a poder eliminar antes de
 * intentarlo, en vez de dejar que el backend responda 409.
 */
import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  cargando,
  cargar,
  cerrarEntorno,
  declararEscenario,
  declararUsuario,
  dibujar,
  falla,
  respondeCon,
  texto,
} from './entorno.js';

const CLAVE = 'proyectos-0';

const CON_INCIDENCIAS = {
  id_proyecto: 1,
  nombre: 'Portal de Clientes',
  descripcion: 'Portal web de autoatencion para clientes.',
  fecha_inicio: '2026-03-01',
  estado: 'ACTIVO',
  total_incidencias: 7,
  incidencias_pendientes: 3,
};

const VACIO = {
  id_proyecto: 2,
  nombre: 'Modulo de Reportes',
  descripcion: null,
  fecha_inicio: null,
  estado: 'PAUSADO',
  total_incidencias: 0,
  incidencias_pendientes: 0,
};

const LISTA = respondeCon({
  datos: [CON_INCIDENCIAS, VACIO],
  paginacion: { total: 2, pagina: 1, limite: 100, paginas: 1 },
});

const dibujarProyectos = async () => {
  const { default: Proyectos } = await cargar('/src/pages/Proyectos.jsx');
  return dibujar(Proyectos, { ruta: '/proyectos', patron: '/proyectos' });
};

// Cada prueba parte con el usuario por defecto, que es administrador.
beforeEach(() => declararUsuario());

after(() => {
  declararUsuario();
  return cerrarEntorno();
});

describe('Pantalla de proyectos', () => {
  test('lista los proyectos con su estado y sus dos cifras', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    const visible = texto(await dibujarProyectos());

    assert.match(visible, /Portal de Clientes/);
    assert.match(visible, /Portal web de autoatencion/);

    // El estado en su forma legible, no el identificador del backend.
    assert.match(visible, /Activo/);
    assert.match(visible, /Pausado/);
    assert.doesNotMatch(visible, /PAUSADO/);

    // Las dos cifras: lo hecho y lo que queda.
    assert.match(visible, /7 en total, 3 sin cerrar/);
  });

  test('un proyecto sin fecha lo dice en vez de dejar la celda vacia', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    assert.match(texto(await dibujarProyectos()), /Sin fecha/);
  });

  test('un administrador ve las acciones', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    const html = await dibujarProyectos();
    const visible = texto(html);

    assert.match(visible, /Nuevo proyecto/);
    assert.match(visible, /Editar/);
    assert.match(visible, /Eliminar/);
    assert.match(visible, /Acciones/);
  });

  test('quien no es administrador ve la tabla pero ninguna accion', async () => {
    declararUsuario({ rol: 'TESTER', nombre: 'Daniela Rojas' });
    declararEscenario({ [CLAVE]: LISTA });

    const html = await dibujarProyectos();
    const visible = texto(html);

    // La tabla si: listar proyectos no exige ser administrador.
    assert.match(visible, /Portal de Clientes/);

    // Las acciones no, ni la columna que las contiene.
    assert.doesNotMatch(visible, /Nuevo proyecto/);
    assert.doesNotMatch(visible, /Eliminar/);
    assert.doesNotMatch(visible, /Acciones/);

    // Y el subtitulo no promete lo que ese rol no puede hacer.
    assert.doesNotMatch(visible, /Crea, modifica/);
  });

  test('el formulario no esta abierto al entrar', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    const visible = texto(await dibujarProyectos());

    // Se abre al pulsar "Nuevo proyecto"; al entrar, la tabla es lo que importa.
    assert.doesNotMatch(visible, /Fecha de inicio/);
    assert.doesNotMatch(visible, /Guardar/);
  });

  test('un listado vacio lo dice', async () => {
    declararEscenario({
      [CLAVE]: respondeCon({
        datos: [],
        paginacion: { total: 0, pagina: 1, limite: 100, paginas: 0 },
      }),
    });

    const visible = texto(await dibujarProyectos());

    assert.match(visible, /Todav\u00eda no hay proyectos registrados/);
  });

  test('un error ofrece reintentar', async () => {
    declararEscenario({ [CLAVE]: falla('No se pudo conectar con el servidor.', 0) });

    const visible = texto(await dibujarProyectos());

    assert.match(visible, /No se pudo conectar/);
    assert.match(visible, /Reintentar/);
  });

  test('mientras carga lo dice', async () => {
    declararEscenario({ [CLAVE]: cargando() });

    assert.match(texto(await dibujarProyectos()), /Cargando proyectos/);
  });
});
