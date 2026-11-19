/**
 * Menu lateral: las secciones de la aplicacion y quien la esta usando.
 *
 * Reemplaza a la cabecera horizontal. La autora eligio este formato en la
 * modernizacion, por ser el que conoce de herramientas como Jira: las
 * secciones quedan en una columna fija a la izquierda, siempre a la vista, y
 * el contenido gana todo el ancho que necesitan el tablero y el listado. Con
 * siete secciones, la barra de arriba ademas ya empezaba a quedarse corta.
 *
 * En pantallas angostas el menu se pliega a una barra con un boton "Menu" que
 * lo despliega, y se vuelve a plegar al elegir una seccion: una columna de
 * 240px fija en un telefono dejaria el contenido en una franja inservible.
 *
 * Los iconos son SVG escritos aqui mismo, sin libreria: son siete trazos
 * simples, y una dependencia de iconos pesaria mas que toda esta pantalla. Van
 * con aria-hidden porque el nombre de la seccion ya esta escrito al lado.
 */
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useSesion } from '../context/SesionContext.jsx';

/** Trazos de cada icono, en una cuadricula de 24 x 24. */
const TRAZOS = {
  inicio: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  incidencias: (
    <>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </>
  ),
  tablero: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="17" y="4" width="4" height="13" rx="1.5" />
    </>
  ),
  salud: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  proyectos: (
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </>
  ),
  salir: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10" />,
};

function Icono({ nombre }) {
  return (
    <svg
      className="icono"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

/**
 * Las secciones, como datos: agregar una pantalla es agregar una linea.
 * `exacta` distingue el inicio del resto: sin ella, la ruta '/' calzaria con
 * cualquier direccion y el inicio se veria siempre marcado como activo.
 */
const SECCIONES = [
  { ruta: '/', etiqueta: 'Inicio', icono: 'inicio', exacta: true },
  { ruta: '/incidencias', etiqueta: 'Incidencias', icono: 'incidencias' },
  { ruta: '/tablero', etiqueta: 'Tablero', icono: 'tablero' },
  { ruta: '/salud', etiqueta: 'Salud', icono: 'salud' },
  { ruta: '/proyectos', etiqueta: 'Proyectos', icono: 'proyectos' },
  { ruta: '/usuarios', etiqueta: 'Usuarios', icono: 'usuarios' },
];

/** Las iniciales del nombre, para el circulo del usuario. */
function iniciales(nombre) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

export default function MenuLateral() {
  const { usuario, cerrarSesion } = useSesion();
  const { pathname } = useLocation();

  // Solo importa en pantallas angostas, donde el menu se pliega.
  const [abierto, setAbierto] = useState(false);

  // Al cambiar de seccion el menu plegable se cierra solo: quien eligio una
  // seccion quiere ver la seccion, no el menu tapandola.
  useEffect(() => setAbierto(false), [pathname]);

  return (
    <aside className={`lateral${abierto ? ' lateral--abierto' : ''}`}>
      <div className="lateral__barra">
        <div className="lateral__marca">
          <span className="lateral__logo" aria-hidden="true">
            SQ
          </span>
          <strong>Software Quality Hub</strong>
        </div>

        <button
          className="lateral__alternar"
          type="button"
          aria-expanded={abierto}
          aria-controls="menu-secciones"
          onClick={() => setAbierto((valor) => !valor)}
        >
          {abierto ? 'Cerrar' : 'Men\u00fa'}
        </button>
      </div>

      <div className="lateral__cuerpo" id="menu-secciones">
        <nav className="lateral__nav" aria-label="Secciones">
          {SECCIONES.map((seccion) => (
            <NavLink
              key={seccion.ruta}
              to={seccion.ruta}
              end={seccion.exacta}
              // NavLink pone aria-current por su cuenta, de modo que un lector
              // de pantalla tambien anuncia en que seccion se esta, y no solo
              // se ve por el color.
              className={({ isActive }) =>
                isActive ? 'lateral__enlace lateral__enlace--activo' : 'lateral__enlace'
              }
            >
              <Icono nombre={seccion.icono} />
              {seccion.etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="lateral__sesion">
          <span className="lateral__avatar" aria-hidden="true">
            {iniciales(usuario.nombre)}
          </span>
          <span className="lateral__usuario">
            <span className="lateral__nombre">{usuario.nombre}</span>
            <span className="lateral__rol">{usuario.rol}</span>
          </span>

          {/*
            Cerrar sesion no llama al backend: con tokens JWT el servidor no
            guarda sesiones abiertas, asi que no hay nada que cerrar de su lado.
            Salir consiste en olvidar el token que se tenia guardado.
          */}
          <button className="lateral__salir" type="button" onClick={cerrarSesion}>
            <Icono nombre="salir" />
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
