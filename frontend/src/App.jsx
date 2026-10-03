/**
 * Componente raiz de la aplicacion.
 *
 * Su unica responsabilidad es decidir QUE se muestra segun el estado de la
 * sesion. Son tres situaciones y conviene distinguirlas:
 *
 *   comprobando   todavia no se sabe si el token guardado sirve
 *   sin sesion    hay que entrar
 *   con sesion    la aplicacion
 *
 * El primer estado suele olvidarse, y su ausencia produce un defecto visible:
 * quien tiene sesion valida ve parpadear la pantalla de login mientras el
 * backend confirma su token.
 *
 * ---------------------------------------------------------------------------
 * SOBRE EL ENRUTADOR
 *
 * Entra aqui al aparecer la segunda pantalla dentro de la sesion, tal como
 * estaba previsto. Con una sola pantalla era una dependencia sin uso; con dos
 * resuelve algo que no conviene escribir a mano: que la direccion del navegador
 * describa lo que se esta viendo. De eso dependen el boton atras, poder
 * compartir un enlace a un listado filtrado y que recargar no pierda el sitio.
 *
 * Las rutas se declaran solo para quien tiene sesion. Estando fuera no hay nada
 * que enrutar: la unica pantalla accesible es el login, y cualquier direccion
 * que alguien escriba debe llevar alli.
 */
import { Navigate, Route, Routes } from 'react-router-dom';

import Cabecera from './components/Cabecera.jsx';
import DetalleIncidencia from './pages/DetalleIncidencia.jsx';
import Incidencias from './pages/Incidencias.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import Salud from './pages/Salud.jsx';
import NuevaIncidencia from './pages/NuevaIncidencia.jsx';
import { useSesion } from './context/SesionContext.jsx';

export default function App() {
  const { usuario, comprobando } = useSesion();

  if (comprobando) {
    return (
      <main className="pantalla-centrada">
        <span className="estado estado--cargando">Cargando sesi&oacute;n...</span>
      </main>
    );
  }

  if (!usuario) {
    return <Login />;
  }

  return (
    <>
      <Cabecera />

      {/* Cada pagina dibuja su propio <main> con el ancho que necesita: el
          listado de incidencias pide una tabla ancha, y las tarjetas del inicio
          se leen mejor en una columna angosta. Un contenedor unico aqui obligaria
          a las dos a conformarse con el mismo ancho. */}
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/incidencias" element={<Incidencias />} />

        {/* Va junto al listado y no dentro de el: registrar no es "ver una
            incidencia", es otra pantalla. React Router resuelve por
            especificidad, asi que /incidencias/nueva no compite con un futuro
            /incidencias/:id aunque se declaren en cualquier orden. */}
        <Route path="/incidencias/nueva" element={<NuevaIncidencia />} />

        {/* Va DESPUES de /incidencias/nueva. React Router resuelve por
            especificidad y no por orden, asi que hoy da igual; se declara en
            este orden para que al leer el archivo se vea que "nueva" es una
            pantalla y no un id, que es la confusion que produce un :id suelto. */}
        <Route path="/incidencias/:id" element={<DetalleIncidencia />} />

        <Route path="/salud" element={<Salud />} />

        {/* Una direccion que no existe vuelve al inicio en lugar de dejar la
            pantalla en blanco. Se reemplaza la entrada del historial para que el
            boton atras no traiga de vuelta la direccion equivocada. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
