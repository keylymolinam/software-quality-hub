/**
 * Doble de context/SesionContext.jsx para las pruebas de pantallas.
 *
 * Solo implementa useSesion(), que es lo unico que las pantallas usan de este
 * modulo. Sin el doble habria que envolver cada render en el proveedor de
 * verdad, que comprueba el token contra el backend: las pruebas dependerian de
 * tener el servidor levantado.
 *
 * El rol es ADMINISTRADOR para que se dibujen tambien las partes que solo ve
 * ese rol. Las pruebas que necesiten otro rol pueden cambiar USUARIO_DE_PRUEBA.
 */
export const USUARIO_DE_PRUEBA = {
  id_usuario: 1,
  nombre: 'Carolina Nunez',
  correo_electronico: 'carolina.nunez@ejemplo.cl',
  rol: 'ADMINISTRADOR',
};

export function useSesion() {
  return {
    usuario: USUARIO_DE_PRUEBA,
    esAdministrador: USUARIO_DE_PRUEBA.rol === 'ADMINISTRADOR',
    comprobando: false,
    entrar: async () => {},
    cerrarSesion: () => {},
  };
}
