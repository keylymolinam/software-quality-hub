/**
 * Pruebas de la pantalla de usuarios.
 *
 * Esta pantalla concentra las cinco reglas de acceso del sistema, y cada una se
 * comprueba desde los dos lados: que la accion aparezca para quien puede, y que
 * NO aparezca para quien no. Lo segundo es lo que suele romperse al agregar un
 * boton, y lo que un 403 inesperado deja en evidencia frente a un usuario.
 *
 * La regla que mas importa es la de la contrasena: solo el propio usuario, ni un
 * administrador. Si alguna vez apareciera ese boton en la fila de otra persona,
 * la prueba lo dice.
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

const CLAVE = 'usuarios-0';

const ADMINISTRADORA = {
  id_usuario: 1,
  nombre: 'Carolina Nunez',
  correo_electronico: 'carolina.nunez@ejemplo.cl',
  rol: 'ADMINISTRADOR',
  fecha_creacion: '2026-03-31 03:15:03',
};

const DESARROLLADOR = {
  id_usuario: 2,
  nombre: 'Luis Fuentes',
  correo_electronico: 'luis.fuentes@ejemplo.cl',
  rol: 'DESARROLLADOR',
  fecha_creacion: '2026-04-02 10:00:00',
};

const LISTA = respondeCon({
  datos: [ADMINISTRADORA, DESARROLLADOR],
  paginacion: { total: 2, pagina: 1, limite: 100, paginas: 1 },
});

const dibujarUsuarios = async () => {
  const { default: Usuarios } = await cargar('/src/pages/Usuarios.jsx');
  return dibujar(Usuarios, { ruta: '/usuarios', patron: '/usuarios' });
};

/** Las acciones que ofrece la fila de un usuario, por su nombre. */
function accionesDeLaFila(html, nombre) {
  const filas = html.split('<tr>');
  const fila = filas.find((f) => f.includes(nombre));

  if (!fila) return [];

  // El texto llega ya con sus tildes: las entidades del JSX se decodifican al
  // compilar, asi que aqui no hay nada que convertir.
  return [...fila.matchAll(/class="enlace-boton"[^>]*>([^<]+)</g)].map((m) => m[1].trim());
}

beforeEach(() => declararUsuario());

after(() => {
  declararUsuario();
  return cerrarEntorno();
});

describe('Pantalla de usuarios', () => {
  test('lista el equipo con su rol legible y marca la propia cuenta', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    const visible = texto(await dibujarUsuarios());

    assert.match(visible, /Carolina Nunez/);
    assert.match(visible, /luis\.fuentes@ejemplo\.cl/);

    // El rol traducido, no el identificador.
    assert.match(visible, /Administrador/);
    assert.match(visible, /Desarrollador/);
    assert.doesNotMatch(visible, /DESARROLLADOR/);

    // La fila de quien esta mirando queda senalada.
    assert.match(visible, /t\u00fa/);
  });

  test('un administrador puede editar y eliminar a otros, pero no eliminarse', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    const html = await dibujarUsuarios();

    const propias = accionesDeLaFila(html, 'Carolina Nunez');
    const ajenas = accionesDeLaFila(html, 'Luis Fuentes');

    // Sobre otra cuenta: editar y eliminar.
    assert.ok(ajenas.includes('Editar'), 'deberia poder editar a otro');
    assert.ok(ajenas.includes('Eliminar'), 'deberia poder eliminar a otro');

    // Sobre la propia: editar y la contrasena, pero NO eliminar. Borrarse
    // dejaria la sesion apuntando a un usuario que ya no existe.
    assert.ok(propias.includes('Editar'));
    assert.ok(!propias.includes('Eliminar'), 'no deberia ofrecer eliminarse');
  });

  test('la contrasena solo se ofrece en la propia fila, ni para un administrador', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    const html = await dibujarUsuarios();

    assert.ok(accionesDeLaFila(html, 'Carolina Nunez').includes('Contrase\u00f1a'));

    // Es la unica operacion que el rol de administrador no alcanza.
    assert.ok(
      !accionesDeLaFila(html, 'Luis Fuentes').includes('Contrase\u00f1a'),
      'un administrador no puede cambiar la clave de otra persona'
    );
  });

  test('quien no es administrador solo puede actuar sobre su propia cuenta', async () => {
    declararUsuario(DESARROLLADOR);
    declararEscenario({ [CLAVE]: LISTA });

    const html = await dibujarUsuarios();
    const visible = texto(html);

    // Ve el equipo completo: listar no exige ser administrador.
    assert.match(visible, /Carolina Nunez/);
    assert.match(visible, /Luis Fuentes/);

    // No puede crear.
    assert.doesNotMatch(visible, /Nuevo usuario/);

    // Sobre si mismo: editar y la contrasena.
    const propias = accionesDeLaFila(html, 'Luis Fuentes');
    assert.ok(propias.includes('Editar'));
    assert.ok(propias.includes('Contrase\u00f1a'));

    // Sobre la cuenta ajena: nada.
    assert.deepEqual(accionesDeLaFila(html, 'Carolina Nunez'), []);
  });

  test('un administrador ve el boton de crear', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    assert.match(texto(await dibujarUsuarios()), /Nuevo usuario/);
  });

  test('ningun formulario esta abierto al entrar', async () => {
    declararEscenario({ [CLAVE]: LISTA });

    const visible = texto(await dibujarUsuarios());

    assert.doesNotMatch(visible, /Cambiar mi contrase\u00f1a/);
    assert.doesNotMatch(visible, /Nuevo usuario$/);
    assert.doesNotMatch(visible, /Guardar/);
  });

  test('un error ofrece reintentar', async () => {
    declararEscenario({ [CLAVE]: falla('No se pudo conectar con el servidor.', 0) });

    const visible = texto(await dibujarUsuarios());

    assert.match(visible, /No se pudo conectar/);
    assert.match(visible, /Reintentar/);
  });

  test('mientras carga lo dice', async () => {
    declararEscenario({ [CLAVE]: cargando() });

    assert.match(texto(await dibujarUsuarios()), /Cargando usuarios/);
  });
});
