/**
 * Doble de context/SesionContext.jsx para las pruebas de pantallas.
 *
 * Solo implementa useSesion(), que es lo unico que las pantallas usan de este
 * modulo. Sin el doble habria que envolver cada render en el proveedor de
 * verdad, que comprueba el token contra el backend: las pruebas dependerian de
 * tener el servidor levantado.
 *
 * El usuario se puede cambiar por prueba con declararUsuario() del entorno, y
 * eso hace falta porque hay pantallas que ofrecen cosas distintas segun el rol.
 * Por defecto es ADMINISTRADOR, para que se dibuje todo.
 */
export const USUARIO_POR_DEFECTO = {
  id_usuario: 1,
  nombre: 'Carolina Nunez',
  correo_electronico: 'carolina.nunez@ejemplo.cl',
  rol: 'ADMINISTRADOR',
};

export function useSesion() {
  const usuario = globalThis.__USUARIO_DE_PRUEBA ?? USUARIO_POR_DEFECTO;

  return {
    usuario,
    // Se deriva del rol, igual que en el contexto de verdad: si una prueba
    // declara un TESTER, esAdministrador tiene que ser false sin que la prueba
    // lo diga dos veces.
    esAdministrador: usuario.rol === 'ADMINISTRADOR',
    comprobando: false,
    entrar: async () => {},
    cerrarSesion: () => {},
  };
}
