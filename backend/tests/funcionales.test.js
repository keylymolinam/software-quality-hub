/**
 * Pruebas funcionales del backend.
 *
 * Ejercitan las reglas de negocio contra una base de datos de verdad: la
 * maquina de estados, los tres diferenciadores y las invariantes de identidad.
 * Son las pruebas que el proyecto defiende, porque comprueban las decisiones
 * que estan escritas y argumentadas en el codigo, no que el servidor arranque.
 *
 * Se ejecutan con:  npm test
 *
 * ---------------------------------------------------------------------------
 * POR QUE SE IMPORTA CON await import()
 *
 * db/database.js abre el archivo de la base en cuanto se carga, asi que la
 * variable DB_PATH tiene que estar puesta ANTES. Los import estaticos se
 * elevan al principio del modulo y se ejecutarian primero, de modo que no hay
 * donde colocar la asignacion: por eso los modulos del sistema se cargan con
 * await import(), que ocurre despues.
 *
 * Las pruebas usan su propia base y no la de desarrollo. Si usaran la misma,
 * limpiar las tablas antes de cada prueba borraria los datos con los que se
 * esta trabajando, y el resultado dependeria de lo que hubiera dentro.
 *
 * ---------------------------------------------------------------------------
 * SOBRE QUE SE AFIRMA
 *
 * Se afirma sobre el `status` y sobre el `campo` de los detalles, nunca sobre
 * el texto del mensaje. Un mensaje se reescribe para que se entienda mejor y
 * eso no deberia romper una prueba; el codigo HTTP y el campo al que apunta el
 * error si son parte del contrato.
 */
process.env.DB_PATH = './data/pruebas-funcionales.sqlite';

// Se parte de una base nueva en cada corrida. Vaciar las tablas no basta: un
// CHECK creado con una version anterior del esquema sobrevive al DELETE, y al
// agregar un estado las pruebas fallarian por la base y no por el codigo.
for (const sufijo of ['', '-wal', '-shm']) {
  rmSync(`${process.env.DB_PATH}${sufijo}`, { force: true });
}

// Cuatro rondas en vez de diez: el costo de bcrypt es deliberado en produccion
// (ver config/env.js), pero aqui solo haria lentas las pruebas sin comprobar
// nada distinto.
process.env.BCRYPT_RONDAS = '4';

import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';

const { db } = await import('../src/db/database.js');
const Incidencias = await import('../src/services/incidencia.service.js');
const Proyectos = await import('../src/services/proyecto.service.js');
const Usuarios = await import('../src/services/usuario.service.js');
const Salud = await import('../src/services/salud.service.js');
const Auth = await import('../src/services/auth.service.js');
const { clasificar } = await import('../src/services/clasificacion.service.js');

// ---------------------------------------------------------------------------
// Preparacion
// ---------------------------------------------------------------------------

/** Vacia las tablas. El orden respeta las claves foraneas. */
function limpiar() {
  for (const tabla of ['PESO_SALUD', 'HISTORIAL_INCIDENCIA', 'METRICA', 'INCIDENCIA', 'PROYECTO', 'USUARIO']) {
    db.exec(`DELETE FROM ${tabla}`);
  }
}

let proyecto;
let otroProyecto;
let autora;
let revisor;

beforeEach(() => {
  limpiar();

  proyecto = Proyectos.crearProyecto({ nombre: 'Proyecto de pruebas' });
  otroProyecto = Proyectos.crearProyecto({ nombre: 'Otro proyecto' });

  autora = Usuarios.crearUsuario({
    nombre: 'Autora de Prueba',
    correo_electronico: 'autora@ejemplo.cl',
    contrasena: 'ClaveDePrueba1',
    rol: 'ADMINISTRADOR',
  });

  revisor = Usuarios.crearUsuario({
    nombre: 'Revisor de Prueba',
    correo_electronico: 'revisor@ejemplo.cl',
    contrasena: 'ClaveDePrueba2',
    rol: 'DESARROLLADOR',
  });
});

after(() => db.close());

/** Crea una incidencia con valores por defecto validos. */
function crear(datos = {}, idUsuario = autora.id_usuario) {
  return Incidencias.crearIncidencia(
    {
      titulo: 'Fallo generico en el modulo de prueba',
      descripcion: 'Descripcion de prueba con largo suficiente para pasar la validacion.',
      id_proyecto: proyecto.id_proyecto,
      categoria: 'OTRO',
      prioridad: 'MEDIA',
      ...datos,
    },
    idUsuario
  );
}

/** Mueve una incidencia por una secuencia de estados. */
function transicionar(id, estados, comentario = null) {
  let ultima;
  for (const estado of estados) {
    ultima = Incidencias.cambiarEstado(id, { estado, comentario }, autora.id_usuario);
  }
  return ultima;
}

/** Comprueba que una llamada falle con el status y el campo indicados. */
function falla(fn, status, campo = null) {
  assert.throws(fn, (error) => {
    assert.equal(error.status, status, `se esperaba status ${status} y llego ${error.status}`);

    if (campo) {
      const campos = (error.detalles ?? []).map((d) => d.campo);
      assert.ok(
        campos.includes(campo),
        `se esperaba un detalle sobre '${campo}' y llegaron: ${campos.join(', ') || 'ninguno'}`
      );
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Maquina de estados
// ---------------------------------------------------------------------------

describe('Maquina de estados', () => {
  test('recorre el flujo completo, incluida la reapertura', () => {
    const incidencia = crear();
    assert.equal(incidencia.estado, 'ABIERTA');

    assert.equal(transicionar(incidencia.id_incidencia, ['EN_PROGRESO']).estado, 'EN_PROGRESO');
    assert.equal(transicionar(incidencia.id_incidencia, ['RESUELTA']).estado, 'RESUELTA');

    // Reapertura: la solucion no resulto.
    assert.equal(transicionar(incidencia.id_incidencia, ['EN_PROGRESO']).estado, 'EN_PROGRESO');
    assert.equal(transicionar(incidencia.id_incidencia, ['RESUELTA']).estado, 'RESUELTA');

    // QA la prueba y la valida; solo entonces se puede cerrar.
    const validada = transicionar(incidencia.id_incidencia, ['VALIDADA']);
    assert.equal(validada.estado, 'VALIDADA');
    assert.deepEqual(validada.transiciones_posibles, ['CERRADA']);

    const cerrada = transicionar(incidencia.id_incidencia, ['CERRADA']);
    assert.equal(cerrada.estado, 'CERRADA');
    assert.deepEqual(cerrada.transiciones_posibles, []);
  });

  test('rechaza con 409 las transiciones que el flujo no permite', () => {
    const abierta = crear();

    // Saltarse el trabajo: de ABIERTA no se puede ir directo a RESUELTA.
    falla(
      () => Incidencias.cambiarEstado(abierta.id_incidencia, { estado: 'RESUELTA' }, autora.id_usuario),
      409,
      'estado'
    );

    // Saltarse a QA: lo resuelto no se cierra sin validar.
    transicionar(abierta.id_incidencia, ['EN_PROGRESO', 'RESUELTA']);
    falla(
      () => Incidencias.cambiarEstado(abierta.id_incidencia, { estado: 'CERRADA' }, autora.id_usuario),
      409,
      'estado'
    );

    // Y lo validado ya no vuelve a desarrollo: QA dijo que funciona.
    transicionar(abierta.id_incidencia, ['VALIDADA']);
    falla(
      () => Incidencias.cambiarEstado(abierta.id_incidencia, { estado: 'EN_PROGRESO' }, autora.id_usuario),
      409,
      'estado'
    );
  });

  test('CERRADA es final: no admite ningun cambio mas', () => {
    const incidencia = crear();
    transicionar(incidencia.id_incidencia, ['EN_PROGRESO', 'RESUELTA', 'VALIDADA', 'CERRADA']);

    for (const estado of ['ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'VALIDADA']) {
      falla(
        () => Incidencias.cambiarEstado(incidencia.id_incidencia, { estado }, autora.id_usuario),
        409,
        'estado'
      );
    }
  });

  test('pasar al mismo estado en que ya esta es un conflicto, no una operacion vacia', () => {
    const incidencia = crear();

    falla(
      () => Incidencias.cambiarEstado(incidencia.id_incidencia, { estado: 'ABIERTA' }, autora.id_usuario),
      409,
      'estado'
    );
  });

  test('el atajo ABIERTA a CERRADA exige motivo', () => {
    const sinMotivo = crear();

    falla(
      () => Incidencias.cambiarEstado(sinMotivo.id_incidencia, { estado: 'CERRADA' }, autora.id_usuario),
      400,
      'comentario'
    );

    const conMotivo = crear();
    const cerrada = Incidencias.cambiarEstado(
      conMotivo.id_incidencia,
      { estado: 'CERRADA', comentario: 'Duplicada de la anterior.' },
      autora.id_usuario
    );

    assert.equal(cerrada.estado, 'CERRADA');

    // Cerrar sin trabajar no es resolver: no hay fecha de resolucion que poner,
    // y ponerla ensuciaria las metricas de tiempo de resolucion.
    assert.equal(cerrada.fecha_resolucion, null);
  });

  test('rechazar durante el desarrollo tambien exige motivo', () => {
    const incidencia = crear();
    transicionar(incidencia.id_incidencia, ['EN_PROGRESO']);

    falla(
      () => Incidencias.cambiarEstado(incidencia.id_incidencia, { estado: 'CERRADA' }, autora.id_usuario),
      400,
      'comentario'
    );

    const cerrada = Incidencias.cambiarEstado(
      incidencia.id_incidencia,
      { estado: 'CERRADA', comentario: 'No se reproduce.' },
      autora.id_usuario
    );

    assert.equal(cerrada.estado, 'CERRADA');
    assert.equal(cerrada.fecha_resolucion, null);
  });

  test('la fecha de resolucion sigue al estado y no se escribe a mano', () => {
    const incidencia = crear();

    transicionar(incidencia.id_incidencia, ['EN_PROGRESO']);
    assert.equal(Incidencias.obtenerIncidencia(incidencia.id_incidencia).fecha_resolucion, null);

    const resuelta = transicionar(incidencia.id_incidencia, ['RESUELTA']);
    assert.ok(resuelta.fecha_resolucion, 'al resolver deberia quedar la fecha');

    // Al reabrir, la fecha anterior deja de ser cierta.
    const reabierta = transicionar(incidencia.id_incidencia, ['EN_PROGRESO']);
    assert.equal(reabierta.fecha_resolucion, null);

    // Al validar y cerrar, en cambio, se conserva: la resolucion ocurrio al
    // resolver, y la espera de QA no la mueve.
    const otraVezResuelta = transicionar(incidencia.id_incidencia, ['RESUELTA']);
    const cerrada = transicionar(incidencia.id_incidencia, ['VALIDADA', 'CERRADA']);
    assert.equal(cerrada.fecha_resolucion, otraVezResuelta.fecha_resolucion);
  });

  test('cada transicion deja una linea en la bitacora, con autor y motivo', () => {
    const incidencia = crear();

    Incidencias.cambiarEstado(
      incidencia.id_incidencia,
      { estado: 'EN_PROGRESO', comentario: 'Se toma para diagnostico.' },
      revisor.id_usuario
    );

    const bitacora = Incidencias.obtenerHistorial(incidencia.id_incidencia);

    // Dos lineas: la creacion y el cambio.
    assert.equal(bitacora.length, 2);

    // El primer registro es la creacion y no tiene estado anterior.
    assert.equal(bitacora[0].estado_anterior, null);
    assert.equal(bitacora[0].estado_nuevo, 'ABIERTA');

    const cambio = bitacora[1];
    assert.equal(cambio.estado_anterior, 'ABIERTA');
    assert.equal(cambio.estado_nuevo, 'EN_PROGRESO');
    assert.equal(cambio.comentario, 'Se toma para diagnostico.');
    assert.equal(cambio.modificado_por, revisor.id_usuario);
    assert.equal(cambio.modificado_por_nombre, revisor.nombre);
  });

  test('la bitacora se lee del cambio mas antiguo al mas reciente', () => {
    const incidencia = crear();
    transicionar(incidencia.id_incidencia, ['EN_PROGRESO', 'RESUELTA', 'EN_PROGRESO']);

    const estados = Incidencias.obtenerHistorial(incidencia.id_incidencia).map((m) => m.estado_nuevo);

    assert.deepEqual(estados, ['ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'EN_PROGRESO']);
  });

  test('el estado no se puede cambiar por la via de actualizar', () => {
    const incidencia = crear();

    falla(
      () => Incidencias.actualizarIncidencia(incidencia.id_incidencia, { estado: 'CERRADA' }),
      400,
      'estado'
    );

    // Tampoco la fecha de resolucion ni la marca del motor.
    falla(
      () =>
        Incidencias.actualizarIncidencia(incidencia.id_incidencia, {
          fecha_resolucion: '2026-01-01 00:00:00',
        }),
      400,
      'fecha_resolucion'
    );
    falla(
      () => Incidencias.actualizarIncidencia(incidencia.id_incidencia, { clasificacion_automatica: 1 }),
      400,
      'clasificacion_automatica'
    );
  });

  test('una incidencia que no existe da 404 en todas las operaciones', () => {
    falla(() => Incidencias.obtenerIncidencia(9999), 404);
    falla(() => Incidencias.obtenerHistorial(9999), 404);
    falla(() => Incidencias.cambiarEstado(9999, { estado: 'EN_PROGRESO' }, autora.id_usuario), 404);
  });
});

// ---------------------------------------------------------------------------
// Diferenciador 1: deteccion de duplicados
// ---------------------------------------------------------------------------

describe('Deteccion de duplicados', () => {
  const ORIGINAL = {
    titulo: 'El portal no carga para los usuarios',
    descripcion: 'Al entrar al portal el navegador muestra un error 500 y no carga nada.',
  };

  const PARECIDA = {
    titulo: 'El portal no carga para los usuarios',
    descripcion: 'Al entrar al portal, el navegador muestra un error 500 y no carga nada.',
  };

  const DISTINTA = {
    titulo: 'Agregar un filtro por fecha en el listado',
    descripcion: 'Seria util poder acotar el listado indicando un rango de fechas.',
  };

  test('avisa del parecido y senala la incidencia original', () => {
    const original = crear(ORIGINAL);
    const repetida = crear(PARECIDA);

    const aviso = repetida.advertencia_duplicado;

    assert.ok(aviso, 'la segunda incidencia deberia traer la advertencia');
    assert.equal(aviso.id_incidencia, original.id_incidencia);
    assert.equal(repetida.posible_duplicado_de, original.id_incidencia);

    // El aviso entrega la evidencia que lo sostiene, no solo el veredicto.
    assert.ok(aviso.similitud > aviso.umbral);
    assert.ok(aviso.evaluadas >= 1);
    assert.equal(aviso.titulo, original.titulo);
  });

  test('avisa pero no impide: la incidencia queda registrada igual', () => {
    crear(ORIGINAL);
    const repetida = crear(PARECIDA);

    const guardada = Incidencias.obtenerIncidencia(repetida.id_incidencia);

    assert.equal(guardada.estado, 'ABIERTA');
    assert.equal(guardada.id_incidencia, repetida.id_incidencia);
  });

  test('no avisa cuando los textos no se parecen', () => {
    crear(ORIGINAL);
    const otra = crear(DISTINTA);

    assert.equal(otra.advertencia_duplicado, undefined);
    assert.equal(otra.posible_duplicado_de, null);
  });

  test('solo compara dentro del mismo proyecto', () => {
    crear(ORIGINAL);

    // El mismo texto, en otro proyecto: no es el mismo problema.
    const enOtroProyecto = crear({ ...PARECIDA, id_proyecto: otroProyecto.id_proyecto });

    assert.equal(enOtroProyecto.advertencia_duplicado, undefined);
    assert.equal(enOtroProyecto.posible_duplicado_de, null);
  });

  test('el duplicado apunta a la mas antigua, no a la ultima', () => {
    const primera = crear(ORIGINAL);
    const segunda = crear(PARECIDA);
    const tercera = crear(PARECIDA);

    assert.equal(segunda.posible_duplicado_de, primera.id_incidencia);
    assert.equal(tercera.posible_duplicado_de, primera.id_incidencia);
  });

  test('el filtro de duplicados trae la pareja completa, no solo la marcada', () => {
    const original = crear(ORIGINAL);
    const repetida = crear(PARECIDA);
    crear(DISTINTA);

    const { datos, paginacion } = Incidencias.listarIncidencias({ posible_duplicado: '1' });

    assert.deepEqual(
      datos.map((i) => i.id_incidencia).sort((a, b) => a - b),
      [original.id_incidencia, repetida.id_incidencia]
    );
    assert.equal(paginacion.total, 2, 'el total tiene que contar con el mismo filtro');
  });

  test('la original sabe cuales se le parecen, y lo olvida al descartar', () => {
    const original = crear(ORIGINAL);
    const repetida = crear(PARECIDA);

    assert.deepEqual(
      Incidencias.obtenerIncidencia(original.id_incidencia).duplicados_detectados,
      [repetida.id_incidencia]
    );
    assert.deepEqual(Incidencias.obtenerIncidencia(repetida.id_incidencia).duplicados_detectados, []);

    // Descartar en la marcada basta: la original no guarda una copia que
    // pudiera quedar desfasada.
    Incidencias.actualizarIncidencia(repetida.id_incidencia, { posible_duplicado_de: null });
    assert.deepEqual(Incidencias.obtenerIncidencia(original.id_incidencia).duplicados_detectados, []);
  });

  test('el filtro de duplicados solo acepta 1', () => {
    falla(() => Incidencias.listarIncidencias({ posible_duplicado: 'si' }), 400, 'posible_duplicado');
  });
});

// ---------------------------------------------------------------------------
// Lo que necesita el tablero
// ---------------------------------------------------------------------------

describe('Listado para el tablero', () => {
  const cerrarSinResolver = (id) =>
    Incidencias.cambiarEstado(id, { estado: 'CERRADA', comentario: 'No aplica.' }, autora.id_usuario);

  test('cada fila del listado trae sus transiciones posibles', () => {
    const pendiente = crear();
    const resuelta = crear({
      titulo: 'Otra falla distinta para el tablero',
      descripcion: 'Un texto que no se parece en nada al de la primera incidencia.',
    });
    transicionar(resuelta.id_incidencia, ['EN_PROGRESO', 'RESUELTA']);

    const { datos } = Incidencias.listarIncidencias({});
    const de = (id) => datos.find((i) => i.id_incidencia === id).transiciones_posibles;

    assert.deepEqual(de(pendiente.id_incidencia), ['EN_PROGRESO', 'CERRADA']);
    assert.deepEqual(de(resuelta.id_incidencia), ['EN_PROGRESO', 'VALIDADA']);
  });

  test('filtra las cerradas en los ultimos N dias, segun la bitacora', () => {
    const reciente = crear();
    const antigua = crear({
      titulo: 'Una falla vieja que ya se cerro',
      descripcion: 'Un texto que no se parece en nada al de la incidencia reciente.',
    });
    cerrarSinResolver(reciente.id_incidencia);
    cerrarSinResolver(antigua.id_incidencia);

    // El cierre de la antigua se lleva 40 dias atras en la bitacora.
    db.prepare(
      `UPDATE HISTORIAL_INCIDENCIA SET fecha_cambio = datetime('now', '-40 days')
        WHERE id_incidencia = ? AND estado_nuevo = 'CERRADA'`
    ).run(antigua.id_incidencia);

    const { datos, paginacion } = Incidencias.listarIncidencias({
      estado: 'CERRADA',
      cerrada_hace_dias: '30',
    });

    assert.deepEqual(
      datos.map((i) => i.id_incidencia),
      [reciente.id_incidencia]
    );
    assert.equal(paginacion.total, 1);
  });

  test('el resumen cuenta cada estado con los demas filtros, sin el de estado', () => {
    crear();
    const enDesarrollo = crear({
      titulo: 'Otra falla distinta para el resumen',
      descripcion: 'Un texto que no se parece en nada al de la primera incidencia.',
    });
    transicionar(enDesarrollo.id_incidencia, ['EN_PROGRESO']);

    // Filtrado por estado, las tarjetas siguen contando los cinco.
    const { resumen_estados } = Incidencias.listarIncidencias({ estado: 'ABIERTA' });
    assert.deepEqual(resumen_estados, {
      ABIERTA: 1,
      EN_PROGRESO: 1,
      RESUELTA: 0,
      VALIDADA: 0,
      CERRADA: 0,
    });

    // Los demas filtros si cuentan: otro proyecto no tiene ninguna.
    const otro = Incidencias.listarIncidencias({ id_proyecto: String(proyecto.id_proyecto + 1000) });
    assert.equal(otro.resumen_estados.ABIERTA, 0);
    assert.equal(otro.resumen_estados.EN_PROGRESO, 0);
  });

  test('el plazo de cierre tiene que ser un entero positivo', () => {
    falla(() => Incidencias.listarIncidencias({ cerrada_hace_dias: '0' }), 400, 'cerrada_hace_dias');
    falla(() => Incidencias.listarIncidencias({ cerrada_hace_dias: 'mes' }), 400, 'cerrada_hace_dias');
  });
});

// ---------------------------------------------------------------------------
// Diferenciador 2: clasificacion automatica
// ---------------------------------------------------------------------------

describe('Clasificacion automatica', () => {
  const TEXTO_DE_SEGURIDAD = {
    titulo: 'Un usuario puede entrar sin permisos',
    descripcion: 'Cualquier usuario accede al panel de administracion sin permisos ni token valido.',
  };

  test('deduce categoria y prioridad cuando no se indican', () => {
    const incidencia = crear({
      ...TEXTO_DE_SEGURIDAD,
      categoria: undefined,
      prioridad: undefined,
    });

    assert.equal(incidencia.categoria, 'SEGURIDAD');

    // La marca solo se pone cuando el motor decidio las DOS cosas.
    assert.equal(incidencia.clasificacion_automatica, 1);

    // Y adjunta la evidencia que lo justifica.
    assert.ok(incidencia.clasificacion);
    assert.ok(incidencia.clasificacion.evidencia.terminos_categoria.length > 0);
  });

  test('nunca sobreescribe una decision humana', () => {
    const incidencia = crear({
      ...TEXTO_DE_SEGURIDAD,
      categoria: 'USABILIDAD_INTERFAZ',
      prioridad: 'BAJA',
    });

    assert.equal(incidencia.categoria, 'USABILIDAD_INTERFAZ');
    assert.equal(incidencia.prioridad, 'BAJA');
    assert.equal(incidencia.clasificacion_automatica, 0);
  });

  test('una clasificacion mixta no se atribuye al motor', () => {
    // La persona elige solo la prioridad: el motor rellena la categoria, pero
    // la decision ya no es suya del todo y la marca queda en 0.
    const incidencia = crear({
      ...TEXTO_DE_SEGURIDAD,
      categoria: undefined,
      prioridad: 'BAJA',
    });

    assert.equal(incidencia.categoria, 'SEGURIDAD');
    assert.equal(incidencia.prioridad, 'BAJA');
    assert.equal(incidencia.clasificacion_automatica, 0);
  });

  test('clasificar() no guarda nada y devuelve su evidencia', () => {
    const antes = db.prepare('SELECT COUNT(*) AS total FROM INCIDENCIA').get().total;

    const resultado = clasificar(TEXTO_DE_SEGURIDAD);

    assert.equal(resultado.categoria, 'SEGURIDAD');
    assert.ok(resultado.confianza >= 0 && resultado.confianza <= 1);
    assert.ok(Object.hasOwn(resultado.evidencia, 'puntajes'));

    const despues = db.prepare('SELECT COUNT(*) AS total FROM INCIDENCIA').get().total;
    assert.equal(despues, antes, 'clasificar() no debe escribir en la base');
  });
});

// ---------------------------------------------------------------------------
// Diferenciador 3: indice de salud
// ---------------------------------------------------------------------------

describe('Indice de salud', () => {
  test('sin incidencias informa SIN_DATOS en vez de fingir salud', () => {
    const salud = Salud.calcularSalud(proyecto.id_proyecto);

    assert.equal(salud.datos_suficientes, false);
    assert.equal(salud.etiqueta, 'SIN_DATOS');
  });

  test('el indice es la suma ponderada de sus tres componentes', () => {
    crear();
    crear({ categoria: 'SEGURIDAD' });

    const salud = Salud.calcularSalud(proyecto.id_proyecto);
    const { antiguedad, reapertura, densidad } = salud.componentes;

    // Los pesos declarados deben sumar 1: si alguien cambia uno y olvida los
    // otros, el indice deja de estar en la escala de 0 a 100.
    const suma = antiguedad.peso + reapertura.peso + densidad.peso;
    assert.ok(Math.abs(suma - 1) < 1e-9, `los pesos suman ${suma}`);

    const esperado =
      antiguedad.puntaje * antiguedad.peso +
      reapertura.puntaje * reapertura.peso +
      densidad.puntaje * densidad.peso;

    // Se compara con tolerancia porque los valores vienen redondeados.
    assert.ok(
      Math.abs(salud.indice - esperado) < 0.5,
      `el indice ${salud.indice} no corresponde a la suma ponderada ${esperado}`
    );
  });

  test('una reapertura castiga el indice y queda a la vista en el desglose', () => {
    const a = crear();
    const b = crear({ categoria: 'SEGURIDAD' });

    transicionar(a.id_incidencia, ['EN_PROGRESO', 'RESUELTA']);
    transicionar(b.id_incidencia, ['EN_PROGRESO', 'RESUELTA']);

    const antes = Salud.calcularSalud(proyecto.id_proyecto);
    assert.equal(antes.componentes.reapertura.incidencias_reabiertas, 0);

    // Se reabre una de las dos: la tasa pasa a 0.5, por encima del limite.
    transicionar(a.id_incidencia, ['EN_PROGRESO']);

    const despues = Salud.calcularSalud(proyecto.id_proyecto);

    assert.equal(despues.componentes.reapertura.incidencias_reabiertas, 1);
    assert.ok(
      despues.componentes.reapertura.puntaje < antes.componentes.reapertura.puntaje,
      'el componente de reapertura deberia bajar'
    );
    assert.ok(despues.indice < antes.indice, 'el indice deberia bajar');
  });

  test('el desglose entrega la evidencia de cada componente', () => {
    crear();

    const { componentes, contexto } = Salud.calcularSalud(proyecto.id_proyecto);

    // Antiguedad: cuantas hay abiertas y desde cuando.
    assert.equal(componentes.antiguedad.incidencias_abiertas, 1);
    assert.ok(Object.hasOwn(componentes.antiguedad, 'limite_dias'));

    // Reapertura: el numerador y el denominador de la tasa.
    assert.ok(Object.hasOwn(componentes.reapertura, 'incidencias_totales'));
    assert.ok(Object.hasOwn(componentes.reapertura, 'tasa'));

    // Densidad: en cuantas categorias se reparte la carga.
    assert.equal(componentes.densidad.categorias_con_carga, 1);
    assert.equal(componentes.densidad.de_un_total_de, 6);

    // Y el contexto que permite interpretar el numero.
    assert.ok(Object.hasOwn(contexto, 'por_estado'));
    assert.ok(Object.hasOwn(contexto, 'tiempo_medio_resolucion_dias'));
  });

  test('la vista general ordena los proyectos de peor a mejor', () => {
    // Un proyecto con una reapertura y otro limpio.
    const mala = crear();
    transicionar(mala.id_incidencia, ['EN_PROGRESO', 'RESUELTA', 'EN_PROGRESO', 'RESUELTA']);

    const buena = crear({ id_proyecto: otroProyecto.id_proyecto });
    transicionar(buena.id_incidencia, ['EN_PROGRESO', 'RESUELTA']);

    const general = Salud.calcularSaludGeneral();
    const conDatos = general.proyectos.filter((p) => p.datos_suficientes);

    assert.ok(conDatos.length >= 2);

    // Peor primero.
    for (let i = 1; i < conDatos.length; i += 1) {
      assert.ok(
        conDatos[i - 1].indice <= conDatos[i].indice,
        'los proyectos deberian venir de peor a mejor'
      );
    }

    // Y los que no tienen datos van al final, no mezclados.
    const indiceSinDatos = general.proyectos.findIndex((p) => !p.datos_suficientes);
    if (indiceSinDatos !== -1) {
      const restantes = general.proyectos.slice(indiceSinDatos);
      assert.ok(restantes.every((p) => !p.datos_suficientes));
    }
  });
});

// ---------------------------------------------------------------------------
// Pesos del indice, editables por el administrador
// ---------------------------------------------------------------------------

describe('Pesos del indice de salud', () => {
  const pesos = (antiguedad, reapertura, densidad, motivo = 'Ajuste acordado con el equipo.') => ({
    antiguedad,
    reapertura,
    densidad,
    motivo,
  });

  test('sin cambios rigen los pesos iniciales, sin autor', () => {
    const { vigentes, historial } = Salud.obtenerPesos();

    assert.equal(vigentes.antiguedad, Salud.PESOS_INICIALES.antiguedad);
    assert.equal(vigentes.reapertura, Salud.PESOS_INICIALES.reapertura);
    assert.equal(vigentes.densidad, Salud.PESOS_INICIALES.densidad);
    assert.equal(vigentes.modificado_por, null);
    assert.equal(historial.length, 0);
  });

  test('cambiar los pesos cambia el indice, con los mismos datos', () => {
    // Una incidencia vieja de un dia no baja nada; lo que se mueve es la
    // reapertura: una de dos reabierta deja ese componente en 0.
    const a = crear();
    const b = crear({ categoria: 'SEGURIDAD' });
    transicionar(a.id_incidencia, ['EN_PROGRESO', 'RESUELTA', 'EN_PROGRESO']);
    transicionar(b.id_incidencia, ['EN_PROGRESO', 'RESUELTA']);

    const antes = Salud.calcularSalud(proyecto.id_proyecto);

    // Mas peso a la reapertura, que es el componente que esta mal.
    Salud.cambiarPesos(pesos(20, 60, 20), autora.id_usuario);

    const despues = Salud.calcularSalud(proyecto.id_proyecto);

    assert.equal(despues.componentes.reapertura.peso, 0.6);
    assert.equal(
      despues.componentes.reapertura.puntaje,
      antes.componentes.reapertura.puntaje,
      'los puntajes no dependen de los pesos'
    );
    assert.ok(despues.indice < antes.indice, 'el indice deberia bajar');
  });

  test('todos los proyectos se miden con los mismos pesos', () => {
    crear();
    crear({ id_proyecto: otroProyecto.id_proyecto });
    Salud.cambiarPesos(pesos(50, 30, 20), autora.id_usuario);

    const { global, proyectos } = Salud.calcularSaludGeneral();

    for (const ambito of [global, ...proyectos]) {
      assert.equal(ambito.componentes.antiguedad.peso, 0.5);
      assert.equal(ambito.componentes.reapertura.peso, 0.3);
      assert.equal(ambito.componentes.densidad.peso, 0.2);
    }
  });

  test('los pesos deben sumar 100', () => {
    falla(() => Salud.cambiarPesos(pesos(50, 50, 10), autora.id_usuario), 400, 'pesos');
    assert.equal(Salud.obtenerPesos().historial.length, 0, 'no deberia guardarse nada');
  });

  test('cada peso es un entero de 0 a 100', () => {
    falla(() => Salud.cambiarPesos(pesos(-10, 60, 50), autora.id_usuario), 400, 'antiguedad');
    falla(() => Salud.cambiarPesos(pesos(40.5, 34.5, 25), autora.id_usuario), 400, 'antiguedad');
    falla(() => Salud.cambiarPesos({ motivo: 'Sin pesos' }, autora.id_usuario), 400, 'densidad');
  });

  test('el cambio exige un motivo', () => {
    falla(() => Salud.cambiarPesos(pesos(40, 35, 25, ''), autora.id_usuario), 400, 'motivo');
  });

  test('cada cambio queda en la historia, con quien y por que', () => {
    Salud.cambiarPesos(pesos(50, 30, 20, 'Primera prueba de pesos.'), autora.id_usuario);
    Salud.cambiarPesos(pesos(30, 50, 20, 'Segunda prueba de pesos.'), revisor.id_usuario);

    const { vigentes, historial } = Salud.obtenerPesos();

    assert.equal(vigentes.antiguedad, 30);
    assert.equal(vigentes.modificado_por.id_usuario, revisor.id_usuario);
    assert.equal(historial.length, 2);
    // El mas reciente primero, y el anterior intacto.
    assert.equal(historial[0].motivo, 'Segunda prueba de pesos.');
    assert.equal(historial[1].antiguedad, 50);
    assert.equal(historial[1].modificado_por, autora.id_usuario);
  });

  test('quien cambio los pesos no se puede eliminar: la historia perderia su autor', () => {
    Salud.cambiarPesos(pesos(50, 30, 20), revisor.id_usuario);

    // 409 y no un 500 por la clave foranea: el servidor esta bien, lo que
    // impide el borrado es la trazabilidad.
    falla(() => Usuarios.eliminarUsuario(revisor.id_usuario), 409);
    assert.equal(Salud.obtenerPesos().vigentes.modificado_por.id_usuario, revisor.id_usuario);
  });

  // El rol se exige en la ruta, asi que esta prueba va por HTTP.
  test('quien no es administrador recibe 403 al cambiarlos', async () => {
    const { default: app } = await import('../src/app.js');
    const servidor = app.listen(0);
    await new Promise((resolve) => servidor.once('listening', resolve));

    try {
      const respuesta = await fetch(`http://localhost:${servidor.address().port}/api/metricas/pesos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Auth.emitirToken(revisor)}`,
        },
        body: JSON.stringify(pesos(10, 10, 80)),
      });

      assert.equal(respuesta.status, 403);
      assert.equal(Salud.obtenerPesos().historial.length, 0);
    } finally {
      servidor.close();
    }
  });
});

// ---------------------------------------------------------------------------
// La identidad sale del token
// ---------------------------------------------------------------------------

describe('La identidad sale de la sesion y no del cuerpo', () => {
  test('el autor de una incidencia es el de la sesion', () => {
    const incidencia = crear({}, revisor.id_usuario);

    assert.equal(incidencia.reportado_por, revisor.id_usuario);
  });

  test('declarar reportado_por en el cuerpo se rechaza', () => {
    falla(
      () =>
        Incidencias.crearIncidencia(
          {
            titulo: 'Intento de firmar a nombre de otra persona',
            descripcion: 'El cuerpo trae reportado_por apuntando a otro usuario.',
            id_proyecto: proyecto.id_proyecto,
            reportado_por: revisor.id_usuario,
          },
          autora.id_usuario
        ),
      400,
      'reportado_por'
    );
  });

  test('declarar modificado_por en una transicion se rechaza', () => {
    const incidencia = crear();

    falla(
      () =>
        Incidencias.cambiarEstado(
          incidencia.id_incidencia,
          { estado: 'EN_PROGRESO', modificado_por: revisor.id_usuario },
          autora.id_usuario
        ),
      400,
      'modificado_por'
    );
  });

  test('el estado inicial lo fija el sistema, no el cliente', () => {
    const incidencia = crear({ estado: 'CERRADA' });

    // Al crear, un estado enviado se ignora en silencio: solo hay un valor
    // legal, asi que forzarlo no le quita nada a quien lo mando.
    assert.equal(incidencia.estado, 'ABIERTA');
  });

  test('la bitacora queda a nombre de quien hizo el cambio', () => {
    const incidencia = crear({}, autora.id_usuario);

    Incidencias.cambiarEstado(incidencia.id_incidencia, { estado: 'EN_PROGRESO' }, revisor.id_usuario);

    const bitacora = Incidencias.obtenerHistorial(incidencia.id_incidencia);

    assert.equal(bitacora[0].modificado_por, autora.id_usuario);
    assert.equal(bitacora[1].modificado_por, revisor.id_usuario);
  });
});

// ---------------------------------------------------------------------------
// Recuperacion de contrasena
// ---------------------------------------------------------------------------

describe('Recuperacion de una contrasena olvidada', () => {
  /** Intenta entrar; devuelve true si la clave sirve. */
  function entra(correo, contrasena) {
    try {
      Auth.iniciarSesion({ correo_electronico: correo, contrasena });
      return true;
    } catch {
      return false;
    }
  }

  test('un administrador restablece la clave de otro: la nueva sirve y la anterior no', () => {
    Usuarios.restablecerContrasena(
      revisor.id_usuario,
      { contrasena_nueva: 'ClaveTemporal9' },
      autora
    );

    assert.equal(entra('revisor@ejemplo.cl', 'ClaveTemporal9'), true);
    assert.equal(entra('revisor@ejemplo.cl', 'ClaveDePrueba2'), false);
  });

  test('sobre la propia cuenta se rechaza: para eso se pide la clave actual', () => {
    falla(
      () =>
        Usuarios.restablecerContrasena(
          autora.id_usuario,
          { contrasena_nueva: 'ClaveTemporal9' },
          autora
        ),
      403
    );
    assert.equal(entra('autora@ejemplo.cl', 'ClaveDePrueba1'), true);
  });

  test('la clave nueva pasa por la misma validacion que al crear la cuenta', () => {
    falla(
      () => Usuarios.restablecerContrasena(revisor.id_usuario, { contrasena_nueva: 'corta' }, autora),
      400,
      'contrasena_nueva'
    );
  });

  test('un usuario que no existe da 404', () => {
    falla(
      () => Usuarios.restablecerContrasena(999999, { contrasena_nueva: 'ClaveTemporal9' }, autora),
      404
    );
  });

  // El rol se exige en la ruta y no en el service, asi que esta prueba va por
  // HTTP: es la unica forma de comprobar que el middleware esta puesto.
  test('quien no es administrador recibe 403 en la ruta', async () => {
    const { default: app } = await import('../src/app.js');
    const servidor = app.listen(0);
    await new Promise((resolve) => servidor.once('listening', resolve));

    try {
      const respuesta = await fetch(
        `http://localhost:${servidor.address().port}/api/usuarios/${autora.id_usuario}/restablecer-contrasena`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Auth.emitirToken(revisor)}`,
          },
          body: JSON.stringify({ contrasena_nueva: 'ClaveTemporal9' }),
        }
      );

      assert.equal(respuesta.status, 403);
      assert.equal(entra('autora@ejemplo.cl', 'ClaveDePrueba1'), true);
    } finally {
      servidor.close();
    }
  });
});
