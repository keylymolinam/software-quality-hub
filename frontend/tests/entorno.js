/**
 * Entorno de render para las pruebas de pantallas.
 *
 * Dibuja un componente de la aplicacion y devuelve su HTML, para poder afirmar
 * cosas sobre lo que la pantalla dice. No hay navegador: se usa
 * renderToStaticMarkup, y eso es lo que permite probar sin agregar jsdom ni un
 * segundo ejecutor de pruebas a un proyecto que hoy corre con node --test.
 *
 * Los .jsx no se pueden importar desde node tal cual, asi que los carga el
 * propio Vite del proyecto. El servidor se crea una sola vez y se reutiliza:
 * arrancarlo en cada prueba multiplicaria el tiempo sin ganar nada.
 *
 * ---------------------------------------------------------------------------
 * COMO SE INYECTAN LOS DOBLES
 *
 * Un plugin de Vite sustituye el CONTENIDO de usePeticion y del contexto de
 * sesion por el de tests/dobles/, interceptando la lectura del modulo. No se usa
 * resolve.alias ni una redireccion de ruta: las dos obligan a entregarle a Vite
 * una ruta absoluta del sistema, y en Windows las barras invertidas no
 * resuelven. Leyendo el archivo con fs ese problema no existe.
 *
 * Lo importante es que el codigo de la aplicacion no sabe que lo estan
 * probando: no se le agrega ni una linea ni un parametro para hacerlo probable.
 *
 * ---------------------------------------------------------------------------
 * QUE NO CUBREN ESTAS PRUEBAS
 *
 * No miran el aspecto (el CSS no se aplica), ni la interaccion (nadie pulsa un
 * boton), ni el hook de peticiones real. Comprueban que las pantallas se
 * dibujan sin reventar y que dicen lo que corresponde en cada situacion. Es
 * deliberadamente lo mas barato que detecta los errores mas caros: una pantalla
 * que no compila, un campo que se renombro en el backend, un numero que se
 * muestra cuando no deberia.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createServer } from 'vite';

import { USUARIO_POR_DEFECTO } from './dobles/SesionContext.js';

/** Que modulo de la aplicacion se sustituye por que doble. */
const DOBLES = [
  ['src/hooks/usePeticion.js', 'dobles/usePeticion.js'],
  ['src/context/SesionContext.jsx', 'dobles/SesionContext.js'],
];

/** Ruta en disco de un archivo de este directorio. */
const rutaLocal = (relativa) => fileURLToPath(new URL(relativa, import.meta.url));

/**
 * Sustituye el CONTENIDO de los modulos, no su ruta.
 *
 * El gancho load() entrega el codigo del doble cuando Vite va a leer el modulo
 * original. Se hace asi, y no con resolve.alias ni redirigiendo en resolveId,
 * porque las dos alternativas obligan a entregarle a Vite una ruta absoluta del
 * sistema: en Windows esa ruta lleva barras invertidas y no resuelve. Aqui la
 * ruta solo la usa fs, que no tiene ese problema.
 */
function pluginDeDobles() {
  return {
    name: 'dobles-de-prueba',
    load(id) {
      // Vite normaliza los id con barras normales, tambien en Windows.
      for (const [original, doble] of DOBLES) {
        if (id.endsWith(original)) {
          return readFileSync(rutaLocal(doble), 'utf8');
        }
      }

      return null;
    },
  };
}

let servidor = null;

async function obtenerServidor() {
  if (!servidor) {
    servidor = await createServer({
      // La raiz es el directorio del paquete: npm ejecuta sus scripts con el
      // directorio de trabajo puesto ahi.
      root: process.cwd(),
      logLevel: 'error',
      // hmr apagado: en pruebas no hay nada que recargar en caliente, y dos
      // archivos de prueba a la vez se pelearian el puerto del websocket.
      server: { middlewareMode: true, hmr: false },
      plugins: [pluginDeDobles()],
    });
  }

  return servidor;
}

/** Carga un modulo de la aplicacion por su ruta desde la raiz del frontend. */
export async function cargar(ruta) {
  const vite = await obtenerServidor();
  return vite.ssrLoadModule(ruta);
}

/** Cierra el servidor. Se llama una vez al terminar las pruebas. */
export async function cerrarEntorno() {
  if (servidor) {
    await servidor.close();
    servidor = null;
  }
}

/**
 * Declara en que situacion esta el backend para el siguiente render.
 *
 * Recibe un objeto { clave de peticion: respuesta del hook }.
 */
export function declararEscenario(escenario) {
  globalThis.__ESCENARIO_DE_PRUEBA = escenario;
}

/**
 * Declara quien esta usando la aplicacion en el siguiente render.
 *
 * Recibe lo que cambia respecto del usuario por defecto, que es administrador:
 * declararUsuario({ rol: 'TESTER' }) alcanza para probar que una pantalla deja
 * de ofrecer las acciones de administracion. Sin argumento vuelve al defecto.
 */
export function declararUsuario(parcial = null) {
  globalThis.__USUARIO_DE_PRUEBA = parcial ? { ...USUARIO_POR_DEFECTO, ...parcial } : null;
}

/** Respuesta del hook con datos listos. */
export const respondeCon = (datos) => ({
  datos,
  cargando: false,
  error: null,
  reintentar: () => {},
});

/** Respuesta del hook que falla. `status` distingue un 404 de un 409 o un 0. */
export const falla = (mensaje, status, detalles = null) => ({
  datos: null,
  cargando: false,
  error: {
    message: mensaje,
    status,
    detalles,
    mensajeDe: (campo) => detalles?.find((d) => d.campo === campo)?.mensaje ?? null,
  },
  reintentar: () => {},
});

/** Respuesta del hook mientras espera. */
export const cargando = () => ({
  datos: null,
  cargando: true,
  error: null,
  reintentar: () => {},
});

/**
 * Dibuja un componente y devuelve su HTML.
 *
 * `ruta` y `patron` hacen falta cuando el componente lee parametros de la
 * direccion: sin una ruta declarada, useParams() no tiene de donde sacarlos.
 */
export function dibujar(componente, { ruta = '/', patron = null, propiedades = {} } = {}) {
  const elemento = patron
    ? createElement(
        Routes,
        null,
        createElement(Route, { path: patron, element: createElement(componente, propiedades) })
      )
    : createElement(componente, propiedades);

  return renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: [ruta] }, elemento)
  );
}

/** El texto visible del HTML, para afirmar sobre lo que la pantalla dice. */
export function texto(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
