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

// Cuatro rondas en vez de diez: el costo de bcrypt es deliberado en produccion
// (ver config/env.js), pero aqui solo haria lentas las pruebas sin comprobar
// nada distinto.
process.env.BCRYPT_RONDAS = '4';

import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

const { db } = await import('../src/db/database.js');
const Incidencias = await import('../src/services/incidencia.service.js');
const Proyectos = await import('../src/services/proyecto.service.js');
const Usuarios = await import('../src/services/usuario.service.js');
const Salud = await import('../src/services/salud.service.js');
const { clasificar } = await import('../src/services/clasificacion.service.js');

// ---------------------------------------------------------------------------
// Preparacion
// ---------------------------------------------------------------------------

/** Vacia las tablas. El orden respeta las claves foraneas. */
function limpiar() {
  for (const tabla of ['HISTORIAL_INCIDENCIA', 'METRICA', 'INCIDENCIA', 'PROYECTO', 'USUARIO']) {
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

    // Cerrar sin pasar por RESUELTA cuando ya se empezo a trabajar.
    transicionar(abierta.id_incidencia, ['EN_PROGRESO']);
    falla(
      () => Incidencias.cambiarEstado(abierta.id_incidencia, { estado: 'CERRADA' }, autora.id_usuario),
      409,
      'estado'
    );
  });

  test('CERRADA es final: no admite ningun cambio mas', () => {
    const incidencia = crear();
    transicionar(incidencia.id_incidencia, ['EN_PROGRESO', 'RESUELTA', 'CERRADA']);

    for (const estado of ['ABIERTA', 'EN_PROGRESO', 'RESUELTA']) {
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

  test('la fecha de resolucion sigue al estado y no se escribe a mano', () => {
    const incidencia = crear();

    transicionar(incidencia.id_incidencia, ['EN_PROGRESO']);
    assert.equal(Incidencias.obtenerIncidencia(incidencia.id_incidencia).fecha_resolucion, null);

    const resuelta = transicionar(incidencia.id_incidencia, ['RESUELTA']);
    assert.ok(resuelta.fecha_resolucion, 'al resolver deberia quedar la fecha');

    // Al reabrir, la fecha anterior deja de ser cierta.
    const reabierta = transicionar(incidencia.id_incidencia, ['EN_PROGRESO']);
    assert.equal(reabierta.fecha_resolucion, null);

    // Al cerrar desde RESUELTA, en cambio, se conserva: ahi el dato queda
    // definitivo para las metricas.
    const otraVezResuelta = transicionar(incidencia.id_incidencia, ['RESUELTA']);
    const cerrada = transicionar(incidencia.id_incidencia, ['CERRADA']);
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
