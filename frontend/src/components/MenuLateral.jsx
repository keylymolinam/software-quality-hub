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
 *
 * Incidencias se despliega como acordeon con un enlace por proyecto, para
 * entrar directo a las de uno solo: quien trabaja en un proyecto no tiene por
 * que pasar cada vez por el filtro. Ver GrupoIncidencias.
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { listarProyectos } from '../api/proyectos.js';
import { rutaVistaPreferida } from './SelectorVista.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { inicialesDe } from '../dominio/incidencias.js';
import { etiquetaEstadoProyecto } from '../dominio/proyectos.js';
import { usePeticion } from '../hooks/usePeticion.js';

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
  flecha: <path d="m6 9 6 6 6-6" />,
};

function Icono({ nombre, clase = 'icono' }) {
  return (
    <svg
      className={clase}
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
  { ruta: '/salud', etiqueta: 'Salud', icono: 'salud' },
  { ruta: '/proyectos', etiqueta: 'Proyectos', icono: 'proyectos' },
  { ruta: '/usuarios', etiqueta: 'Usuarios', icono: 'usuarios' },
];

/**
 * Incidencias con sus proyectos debajo, como acordeon.
 *
 * Cada proyecto es un enlace al listado ya filtrado
 * (`/incidencias?id_proyecto=2`), no una pantalla nueva: el listado ya sabia
 * filtrar por proyecto, y asi las tarjetas por estado, la busqueda y el resto
 * de los filtros siguen funcionando dentro del proyecto, y el filtro Proyecto
 * de la barra muestra el mismo valor que el menu.
 *
 * Aparecen todos los proyectos. Los finalizados y pausados van atenuados y con
 * su estado escrito al lado (el gris solo no lo diria a quien no distingue el
 * tono): se ven menos, pero se pueden revisar igual.
 *
 * La cabecera del grupo es un boton y no un enlace: abre y cierra la lista, y
 * aria-expanded le dice al lector de pantalla en que estado esta. "Todas" es
 * el primer enlace de la lista, para quien quiere el listado completo.
 *
 * Lista y tablero son dos vistas de esta misma seccion (ver SelectorVista.jsx),
 * asi que no hay una entrada "Tablero" aparte. Los enlaces del grupo llevan a
 * la vista en que se esta, o fuera de ella a la ultima que la persona eligio:
 * quien trabaja en columnas no tiene que cambiar de vista cada vez que entra.
 *
 * La lista se vuelve a pedir cada vez que se abre: quien acaba de crear un
 * proyecto lo espera ver ahi sin recargar la pagina, y la peticion es una sola
 * lista corta.
 */
function GrupoIncidencias({ pathname, search }) {
  const enVista = pathname === '/incidencias' || pathname === '/tablero';
  const enIncidencias = enVista || pathname.startsWith('/incidencias/');
  const base = enVista ? pathname : rutaVistaPreferida();
  const [desplegado, setDesplegado] = useState(enIncidencias);
  const [aperturas, setAperturas] = useState(0);

  // Llegar a incidencias por otro camino (un enlace del inicio, el boton
  // atras) tambien abre el grupo, para que se vea en que proyecto se esta.
  useEffect(() => {
    if (enIncidencias) setDesplegado(true);
  }, [enIncidencias]);

  const proyectos = usePeticion(
    () => listarProyectos({ limite: 100 }),
    `menu-proyectos-${aperturas}`
  );

  // Que enlace de la lista corresponde a la direccion actual: '' es "Todas",
  // un numero es ese proyecto, y null es ninguno (el detalle o el registro de
  // una incidencia, que no son el listado).
  const idActivo = enVista ? new URLSearchParams(search).get('id_proyecto') ?? '' : null;

  const alternar = () => {
    if (!desplegado) setAperturas((n) => n + 1);
    setDesplegado(!desplegado);
  };

  const claseSub = (activo, inactivo = false) =>
    'lateral__subenlace' +
    (activo ? ' lateral__subenlace--activo' : '') +
    (inactivo ? ' lateral__subenlace--inactivo' : '');

  return (
    <div className="lateral__grupo">
      <button
        type="button"
        className={
          'lateral__enlace lateral__grupo-boton' +
          // Marcado de lleno solo si ningun enlace de la lista lo esta: en el
          // listado el marcado es el proyecto, y en el detalle, la seccion.
          (enIncidencias && idActivo === null ? ' lateral__enlace--activo' : '') +
          (enIncidencias ? ' lateral__grupo-boton--dentro' : '')
        }
        aria-expanded={desplegado}
        aria-controls="menu-proyectos"
        onClick={alternar}
      >
        <Icono nombre="incidencias" />
        Incidencias
        <Icono
          nombre="flecha"
          clase={`lateral__flecha${desplegado ? ' lateral__flecha--abierta' : ''}`}
        />
      </button>

      {desplegado && (
        <ul className="lateral__sublista" id="menu-proyectos">
          <li>
            <Link
              className={claseSub(idActivo === '')}
              to={base}
              aria-current={idActivo === '' ? 'page' : undefined}
            >
              Todas
            </Link>
          </li>

          {/* Los activos primero: son con los que se trabaja a diario. */}
          {[...(proyectos.datos?.datos ?? [])]
            .sort((a, b) => (a.estado === 'ACTIVO' ? 0 : 1) - (b.estado === 'ACTIVO' ? 0 : 1))
            .map((proyecto) => {
              const activo = idActivo === String(proyecto.id_proyecto);
              const inactivo = proyecto.estado !== 'ACTIVO';
  
              return (
                <li key={proyecto.id_proyecto}>
                  <Link
                    className={claseSub(activo, inactivo)}
                    to={`${base}?id_proyecto=${proyecto.id_proyecto}`}
                    aria-current={activo ? 'page' : undefined}
                  >
                    <span className="lateral__subnombre">{proyecto.nombre}</span>
                    {inactivo && (
                      <span className="lateral__subestado">
                        {etiquetaEstadoProyecto(proyecto.estado)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}

          {proyectos.error && (
            <li className="lateral__subaviso">No se pudieron cargar los proyectos.</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function MenuLateral() {
  const { usuario, cerrarSesion } = useSesion();
  const { pathname, search } = useLocation();

  // Solo importa en pantallas angostas, donde el menu se pliega.
  const [abierto, setAbierto] = useState(false);

  // Al cambiar de seccion el menu plegable se cierra solo: quien eligio una
  // seccion quiere ver la seccion, no el menu tapandola.
  // Tambien al cambiar solo la consulta: elegir un proyecto del acordeon
  // deja la misma ruta y cambia ?id_proyecto.
  useEffect(() => setAbierto(false), [pathname, search]);

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
          {SECCIONES.map((seccion) =>
            seccion.ruta === '/incidencias' ? (
              <GrupoIncidencias key={seccion.ruta} pathname={pathname} search={search} />
            ) : (
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
            )
          )}
        </nav>

        <div className="lateral__sesion">
          <span className="lateral__avatar" aria-hidden="true">
            {inicialesDe(usuario.nombre)}
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
