/**
 * Mide la exactitud del motor de clasificacion contra casos-clasificacion.csv.
 *
 * Uso (desde backend/):
 *   node evaluacion/evaluar.js                         mide y reporta
 *   node evaluacion/evaluar.js --guardar antes.json    ademas guarda cada respuesta
 *   node evaluacion/evaluar.js --antes antes.json      compara con una medicion previa
 *
 * Los casos se dividen en dos grupos fijos:
 *   - ids IMPARES: desarrollo. Se pueden mirar sus errores para ajustar el lexico.
 *   - ids PARES:   prueba. Solo se informa su exactitud, nunca caso por caso.
 *     Si se mirara en que fallan los pares, el ajuste terminaria aprendiendo
 *     las respuestas del examen y la cifra de prueba dejaria de medir algo.
 *
 * Por eso el reporte lista errores SOLO de los impares. La comparacion con
 * --antes muestra el cambio de exactitud de los pares como cifra agregada.
 *
 * Se niega a correr si falta alguna etiqueta: imprimir las respuestas del
 * motor antes de terminar el etiquetado contaminaria la referencia, que es
 * justo lo que INSTRUCCIONES.md pide evitar.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { clasificar } from '../src/services/clasificacion.service.js';

const CARPETA = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i === -1 ? null : args[i + 1];
};

// --casos existe para probar este script con una copia, sin tocar la planilla real.
const ARCHIVO_CASOS = opcion('--casos') ?? join(CARPETA, 'casos-clasificacion.csv');

const CATEGORIAS = [
  'DISPONIBILIDAD', 'RENDIMIENTO', 'SEGURIDAD',
  'USABILIDAD_INTERFAZ', 'DATOS_INTEGRIDAD', 'OTRO',
];
const PRIORIDADES = ['ALTA', 'MEDIA', 'BAJA'];

// ---------------------------------------------------------------------------
// Lectura del CSV
// ---------------------------------------------------------------------------

/**
 * Decodifica el archivo como UTF-8 y, si no lo es, como Windows-1252.
 *
 * Excel en Windows guarda "CSV" en la pagina de codigos del sistema salvo que
 * se elija "CSV UTF-8". Leerlo mal no daria error: convertiria cada tilde en
 * dos simbolos raros, el motor dejaria de reconocer esas palabras y la
 * exactitud bajaria sin que nada lo advirtiera.
 */
function leerTexto(ruta) {
  const bytes = readFileSync(ruta);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/**
 * Parser minimo de CSV con comillas dobles. El separador se deduce de la
 * primera linea: Excel usa ';' o ',' segun la configuracion regional.
 */
function parsearCsv(texto) {
  const separador = texto.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const filas = [];
  let fila = [];
  let campo = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === separador) {
      fila.push(campo); campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.some((v) => v !== '')) filas.push(fila);
      fila = [];
    } else {
      campo += c;
    }
  }
  fila.push(campo);
  if (fila.some((v) => v !== '')) filas.push(fila);

  const [cabecera, ...resto] = filas;
  return resto.map((valores) =>
    Object.fromEntries(cabecera.map((nombre, i) => [nombre.trim(), (valores[i] ?? '').trim()]))
  );
}

function cargarCasos() {
  const casos = parsearCsv(leerTexto(ARCHIVO_CASOS)).map((f) => ({
    id: Number(f.id),
    titulo: f.titulo,
    descripcion: f.descripcion,
    categoria: f.categoria_correcta.toUpperCase(),
    prioridad: f.prioridad_correcta.toUpperCase(),
  }));

  const problemas = [];
  for (const c of casos) {
    if (!CATEGORIAS.includes(c.categoria)) problemas.push(`id ${c.id}: categoria "${c.categoria}"`);
    if (!PRIORIDADES.includes(c.prioridad)) problemas.push(`id ${c.id}: prioridad "${c.prioridad}"`);
  }
  if (problemas.length > 0) {
    console.error(`Hay ${problemas.length} etiquetas vacias o invalidas; no se evalua nada:`);
    for (const p of problemas.slice(0, 10)) console.error(`  ${p}`);
    if (problemas.length > 10) console.error(`  ... y ${problemas.length - 10} mas`);
    process.exit(1);
  }
  return casos;
}

// ---------------------------------------------------------------------------
// Medicion
// ---------------------------------------------------------------------------

const esDesarrollo = (c) => c.id % 2 === 1;

const porcentaje = (a, n) => (n === 0 ? '-' : `${((100 * a) / n).toFixed(1)}%`);

/** Exactitud de un grupo: categoria, prioridad y las dos a la vez. */
function exactitud(resultados) {
  const n = resultados.length;
  const cat = resultados.filter((r) => r.okCategoria).length;
  const pri = resultados.filter((r) => r.okPrioridad).length;
  const ambas = resultados.filter((r) => r.okCategoria && r.okPrioridad).length;
  return { n, cat, pri, ambas };
}

function filaExactitud(nombre, e) {
  return `  ${nombre.padEnd(18)} ${String(e.n).padStart(3)}   ` +
    `${`${e.cat}/${e.n}`.padStart(6)} ${porcentaje(e.cat, e.n).padStart(7)}   ` +
    `${`${e.pri}/${e.n}`.padStart(6)} ${porcentaje(e.pri, e.n).padStart(7)}   ` +
    `${`${e.ambas}/${e.n}`.padStart(6)} ${porcentaje(e.ambas, e.n).padStart(7)}`;
}

function reportarExactitud(titulo, resultados) {
  console.log(`\n${titulo}`);
  console.log('  grupo                n    categoria           prioridad           ambas');
  console.log(filaExactitud('desarrollo (impar)', exactitud(resultados.filter(esDesarrollo))));
  console.log(filaExactitud('prueba (par)', exactitud(resultados.filter((r) => !esDesarrollo(r)))));
  console.log(filaExactitud('los 48', exactitud(resultados)));
}

/** Matriz de confusion de categoria, solo con los casos de desarrollo. */
function reportarConfusion(resultados) {
  const abrev = { DISPONIBILIDAD: 'DISP', RENDIMIENTO: 'REND', SEGURIDAD: 'SEG',
    USABILIDAD_INTERFAZ: 'USAB', DATOS_INTEGRIDAD: 'DATO', OTRO: 'OTRO' };
  console.log('\nConfusion de categoria, solo desarrollo (fila = referencia, columna = motor)');
  console.log(`  ${''.padEnd(6)}${CATEGORIAS.map((c) => abrev[c].padStart(6)).join('')}`);
  for (const real of CATEGORIAS) {
    const celdas = CATEGORIAS.map((pred) =>
      resultados.filter((r) => r.categoria === real && r.motor.categoria === pred).length);
    console.log(`  ${abrev[real].padEnd(6)}${celdas.map((n) => String(n || '.').padStart(6)).join('')}`);
  }
}

function reportarErroresDesarrollo(resultados) {
  const errores = resultados.filter((r) => !r.okCategoria || !r.okPrioridad);
  console.log(`\nErrores en desarrollo: ${errores.length} de ${resultados.length} casos`);
  for (const r of errores) {
    console.log(`\n  #${r.id} ${r.titulo}`);
    console.log(`     ${r.descripcion}`);
    if (!r.okCategoria) {
      console.log(`     categoria: referencia ${r.categoria}, motor ${r.motor.categoria}`);
    }
    if (!r.okPrioridad) {
      console.log(`     prioridad: referencia ${r.prioridad}, motor ${r.motor.prioridad}`);
    }
    const ev = r.motor.evidencia;
    const terminos = ev.terminos_categoria.map((t) => (typeof t === 'string' ? t : JSON.stringify(t)));
    console.log(`     terminos: ${terminos.join(', ') || '(ninguno)'}`);
    console.log(`     puntajes: ${JSON.stringify(ev.puntajes)}  peticion: ${ev.es_peticion}`);
    console.log(`     senales alta: ${JSON.stringify(ev.senales_alta)}  baja: ${JSON.stringify(ev.senales_baja)}`);
  }
}

// ---------------------------------------------------------------------------
// Programa
// ---------------------------------------------------------------------------

const casos = cargarCasos();
const resultados = casos.map((c) => {
  const motor = clasificar({ titulo: c.titulo, descripcion: c.descripcion });
  return {
    ...c,
    motor,
    okCategoria: motor.categoria === c.categoria,
    okPrioridad: motor.prioridad === c.prioridad,
  };
});

reportarExactitud('Exactitud', resultados);

const desarrollo = resultados.filter(esDesarrollo);
reportarConfusion(desarrollo);
reportarErroresDesarrollo(desarrollo);

const rutaAntes = opcion('--antes');
if (rutaAntes) {
  const antes = JSON.parse(readFileSync(rutaAntes, 'utf8'));
  reportarExactitud('Antes del cambio (misma referencia)', antes);
  reportarExactitud('Despues del cambio', resultados);
}

const rutaGuardar = opcion('--guardar');
if (rutaGuardar) {
  const resumen = resultados.map(({ id, okCategoria, okPrioridad }) => ({ id, okCategoria, okPrioridad }));
  writeFileSync(rutaGuardar, JSON.stringify(resumen, null, 2));
  console.log(`\nMedicion guardada en ${rutaGuardar}`);
}
