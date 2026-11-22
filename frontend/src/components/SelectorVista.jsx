/**
 * Selector entre las dos vistas de incidencias: Lista y Tablero.
 *
 * Antes eran dos secciones del menu, "Incidencias" y "Tablero", y parecian dos
 * cosas distintas cuando son las mismas incidencias dibujadas de dos maneras.
 * La autora propuso unirlas como lo hacen las herramientas que conoce un equipo
 * (Monday en lista, Jira en columnas): una sola seccion, y cada quien elige la
 * vista con la que trabaja mejor.
 *
 * Las dos vistas siguen siendo dos paginas con su propia direccion
 * (/incidencias y /tablero), y no una sola pagina que cambia por dentro: asi un
 * enlace lleva a la vista exacta, el boton atras deshace el cambio de vista, y
 * ninguna de las dos pantallas, ya probadas, tuvo que reescribirse.
 *
 * Cambiar de vista conserva los filtros: se copia la cadena de consulta, que
 * usa los mismos nombres en las dos (ver dominio/filtros.js). Al ir al tablero
 * se descarta lo que alli no tiene sentido: estado, orden y pagina.
 *
 * ---------------------------------------------------------------------------
 * LA VISTA PREFERIDA SE RECUERDA EN EL NAVEGADOR
 *
 * La ultima vista elegida se guarda en localStorage, y el menu lateral la usa
 * para decidir a donde llevan sus enlaces. Es una comodidad de cada persona, no
 * un dato del sistema: si el navegador no la guarda (modo privado, datos
 * borrados) se abre el tablero y nada se rompe. Por eso no va al servidor, y por
 * eso cada acceso esta envuelto en try/catch.
 */
import { Link, useLocation } from 'react-router-dom';

import { SOLO_EN_LISTA } from '../dominio/filtros.js';

const CLAVE_PREFERENCIA = 'sqh.vista-incidencias';

/**
 * Tablero primero, a pedido de la autora: es la vista que un equipo reconoce
 * de Jira y la que muestra el avance de un vistazo. Por lo mismo es la que se
 * abre por defecto, hasta que la persona elija otra (tambien lo pidio ella).
 *
 * Cada opcion lleva un icono que dibuja su forma: columnas verticales para el
 * tablero y renglones horizontales para la lista. Acompanan al nombre, no lo
 * reemplazan: un icono solo obliga a adivinar.
 */
const VISTAS = [
  {
    valor: 'tablero',
    etiqueta: 'Tablero',
    ruta: '/tablero',
    trazos: (
      <>
        <rect x="4" y="4" width="4" height="16" rx="1" />
        <rect x="10" y="4" width="4" height="16" rx="1" />
        <rect x="16" y="4" width="4" height="16" rx="1" />
      </>
    ),
  },
  {
    valor: 'lista',
    etiqueta: 'Lista',
    ruta: '/incidencias',
    trazos: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),
  },
];

/** Ruta de la vista que la persona eligio la ultima vez; el tablero si no hay. */
export function rutaVistaPreferida() {
  try {
    const guardada = globalThis.localStorage?.getItem(CLAVE_PREFERENCIA);
    return VISTAS.find((v) => v.valor === guardada)?.ruta ?? '/tablero';
  } catch {
    return '/tablero';
  }
}

function guardarVistaPreferida(valor) {
  try {
    globalThis.localStorage?.setItem(CLAVE_PREFERENCIA, valor);
  } catch {
    // Sin almacenamiento se pierde solo la comodidad de recordar la vista.
  }
}

export default function SelectorVista({ vista }) {
  const { search } = useLocation();

  function destino({ valor, ruta }) {
    const consulta = new URLSearchParams(search);
    if (valor === 'tablero') {
      for (const campo of SOLO_EN_LISTA) consulta.delete(campo);
    }
    const texto = consulta.toString();
    return texto ? `${ruta}?${texto}` : ruta;
  }

  return (
    <nav className="vistas" aria-label="Vista de las incidencias">
      {VISTAS.map((v) => {
        const activa = v.valor === vista;
        return (
          <Link
            key={v.valor}
            className={`vistas__opcion${activa ? ' vistas__opcion--activa' : ''}`}
            to={destino(v)}
            aria-current={activa ? 'page' : undefined}
            onClick={() => guardarVistaPreferida(v.valor)}
          >
            <svg
              className="vistas__icono"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {v.trazos}
            </svg>
            {v.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
