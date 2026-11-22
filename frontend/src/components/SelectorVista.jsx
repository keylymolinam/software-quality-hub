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
 * borrados) se abre la lista y nada se rompe. Por eso no va al servidor, y por
 * eso cada acceso esta envuelto en try/catch.
 */
import { Link, useLocation } from 'react-router-dom';

import { SOLO_EN_LISTA } from '../dominio/filtros.js';

const CLAVE_PREFERENCIA = 'sqh.vista-incidencias';

const VISTAS = [
  { valor: 'lista', etiqueta: 'Lista', ruta: '/incidencias' },
  { valor: 'tablero', etiqueta: 'Tablero', ruta: '/tablero' },
];

/** Ruta de la vista que la persona eligio la ultima vez; la lista si no hay. */
export function rutaVistaPreferida() {
  try {
    const guardada = globalThis.localStorage?.getItem(CLAVE_PREFERENCIA);
    return VISTAS.find((v) => v.valor === guardada)?.ruta ?? '/incidencias';
  } catch {
    return '/incidencias';
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
            {v.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
