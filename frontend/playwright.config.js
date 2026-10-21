/**
 * Configuracion de las pruebas de interaccion (Playwright).
 *
 * Las pruebas de tests/ dibujan pantallas sin navegador y no pueden pulsar un
 * boton. Estas si: levantan el backend y el frontend de verdad, abren Chromium y
 * recorren el sistema como lo haria una persona. Cubren lo que las otras dos
 * suites declaran que no cubren: la interaccion y el hook de peticiones real.
 *
 * Se ejecutan con:  npm run test:e2e   (desde frontend/)
 *
 * ---------------------------------------------------------------------------
 * POR QUE PLAYWRIGHT, SI EL PROYECTO NO TIENE DEPENDENCIAS DE PRUEBA
 *
 * Las otras suites corren con node --test y nada mas, y eso es un criterio. Aqui
 * se rompe a sabiendas: pulsar un boton pide un navegador, y node no trae uno.
 * La alternativa sin dependencias era simular eventos sobre un DOM hecho a mano,
 * que prueba la simulacion y no la aplicacion: no hay validacion nativa de
 * formularios, ni navegacion, ni fetch contra un servidor. Se acepta una
 * dependencia de desarrollo, que no llega al bundle, a cambio de probar lo que
 * de verdad ve quien usa el sistema.
 *
 * ---------------------------------------------------------------------------
 * UNA BASE Y UNOS PUERTOS PROPIOS
 *
 * El backend arranca con su propia base (data/pruebas-e2e.sqlite) y la recarga
 * con el seed antes de empezar. Usar la de desarrollo seria vaciarla en cada
 * corrida. Los puertos tambien son otros (3100 y 5174), para que las pruebas
 * puedan correr con el entorno de desarrollo encendido.
 *
 * reuseExistingServer va apagado a proposito: si el puerto estuviera ocupado,
 * reutilizar lo que haya ahi podria significar escribir en una base ajena. Es
 * preferible que la corrida falle y diga por que.
 *
 * Las variables se pasan por el entorno del proceso, y ganan sobre los .env:
 * dotenv no pisa lo que ya esta definido, y Vite tampoco.
 */
import { defineConfig, devices } from '@playwright/test';

const PUERTO_API = 3100;
const PUERTO_WEB = 5174;

export const API_URL = `http://localhost:${PUERTO_API}/api`;

export default defineConfig({
  testDir: './e2e',

  // Un solo trabajador: todas las pruebas comparten una base, y aunque cada una
  // crea lo que necesita, los listados y el indice ven lo que crean las demas.
  workers: 1,
  fullyParallel: false,

  // Sin reintentos. Una prueba que pasa al segundo intento esta escondiendo un
  // problema de sincronizacion que tarde o temprano aparece en pantalla.
  retries: 0,

  reporter: 'list',

  use: {
    baseURL: `http://localhost:${PUERTO_WEB}`,
    locale: 'es-CL',
    trace: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'npm run db:seed && npm start',
      cwd: '../backend',
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      env: {
        PORT: String(PUERTO_API),
        DB_PATH: './data/pruebas-e2e.sqlite',
        CORS_ORIGIN: `http://localhost:${PUERTO_WEB}`,
        NODE_ENV: 'development',
      },
    },
    {
      command: `npx vite --port ${PUERTO_WEB} --strictPort`,
      url: `http://localhost:${PUERTO_WEB}`,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: API_URL,
        // vite.config.js abre el navegador al arrancar; aqui no hace falta.
        BROWSER: 'none',
      },
    },
  ],
});
