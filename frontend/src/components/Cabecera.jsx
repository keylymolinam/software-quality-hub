/**
 * Barra superior de la aplicacion.
 *
 * Muestra donde se puede ir, quien esta conectado y permite salir. Es el unico
 * lugar donde el usuario ve su propio rol, y eso importa: cuando una accion le
 * responda "no te corresponde", el rol visible explica por que.
 */
import { NavLink } from 'react-router-dom';

import { useSesion } from '../context/SesionContext.jsx';

/**
 * Las secciones de la aplicacion.
 *
 * Se declaran como datos y no como JSX repetido para que agregar una pantalla
 * sea agregar una linea. `exacta` distingue el inicio del resto: sin ella, la
 * ruta '/' calzaria con cualquier direccion y el inicio se veria siempre
 * marcado como la seccion activa.
 */
const SECCIONES = [
  { ruta: '/', etiqueta: 'Inicio', exacta: true },
  { ruta: '/incidencias', etiqueta: 'Incidencias' },
  { ruta: '/salud', etiqueta: 'Salud' },
];

export default function Cabecera() {
  const { usuario, cerrarSesion } = useSesion();

  return (
    <header className="cabecera">
      <div className="cabecera__marca">
        <strong>Software Quality Hub</strong>
      </div>

      <nav className="cabecera__nav" aria-label="Secciones">
        {SECCIONES.map((seccion) => (
          <NavLink
            key={seccion.ruta}
            to={seccion.ruta}
            end={seccion.exacta}
            // NavLink acepta una funcion para la clase y avisa si su ruta es la
            // que esta abierta. Ademas pone aria-current por su cuenta, de modo
            // que un lector de pantalla tambien anuncia en que seccion se esta,
            // y no solo se ve por el color.
            className={({ isActive }) =>
              isActive ? 'cabecera__enlace cabecera__enlace--activo' : 'cabecera__enlace'
            }
          >
            {seccion.etiqueta}
          </NavLink>
        ))}
      </nav>

      <div className="cabecera__sesion">
        <span className="cabecera__usuario">
          {usuario.nombre}
          <span className="etiqueta-rol">{usuario.rol}</span>
        </span>

        {/*
          Cerrar sesion no llama al backend: con tokens JWT el servidor no
          guarda sesiones abiertas, asi que no hay nada que cerrar de su lado.
          Salir consiste en olvidar el token que se tenia guardado.
        */}
        <button className="boton boton--discreto" type="button" onClick={cerrarSesion}>
          Salir
        </button>
      </div>
    </header>
  );
}
