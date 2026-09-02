/**
 * Pruebas de humo ("smoke tests").
 *
 * Son las pruebas mas basicas posibles: no verifican reglas de negocio, solo
 * que el sistema arranca y sus piezas principales responden. Si estas fallan,
 * cualquier otra prueba tambien fallaria.
 *
 * Se ejecutan con:  npm test
 *
 * Las pruebas funcionales completas corresponden a las semanas 10-11.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

import app from '../src/app.js';
import { db } from '../src/db/database.js';

describe('Base de datos', () => {
  test('el esquema crea las cinco entidades del modelo', () => {
    const tablas = db
      .prepare(
        `SELECT name FROM sqlite_master
          WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name`
      )
      .all()
      .map((fila) => fila.name);

    for (const entidad of ['USUARIO', 'PROYECTO', 'INCIDENCIA', 'HISTORIAL_INCIDENCIA', 'METRICA']) {
      assert.ok(tablas.includes(entidad), `falta la tabla ${entidad}`);
    }
  });

  test('las claves foraneas estan activadas', () => {
    const [{ foreign_keys: activadas }] = db.prepare('PRAGMA foreign_keys').all();
    assert.equal(activadas, 1, 'PRAGMA foreign_keys deberia estar en 1');
  });
});

describe('API', () => {
  let servidor;
  let baseUrl;

  // Se levanta la aplicacion en el puerto 0: el sistema operativo asigna uno
  // libre, de modo que la prueba no choca con el servidor de desarrollo.
  before(async () => {
    servidor = app.listen(0);
    await new Promise((resolve) => servidor.once('listening', resolve));
    baseUrl = `http://localhost:${servidor.address().port}`;
  });

  after(() => servidor.close());

  test('GET /api/health responde 200 e informa la base de datos conectada', async () => {
    const respuesta = await fetch(`${baseUrl}/api/health`);
    assert.equal(respuesta.status, 200);

    const cuerpo = await respuesta.json();
    assert.equal(cuerpo.estado, 'operativo');
    assert.equal(cuerpo.baseDatos.conectada, true);
  });

  test('una ruta inexistente responde 404 con formato JSON', async () => {
    const respuesta = await fetch(`${baseUrl}/api/no-existe`);
    assert.equal(respuesta.status, 404);

    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error, 'la respuesta deberia incluir un campo "error"');
  });
});
