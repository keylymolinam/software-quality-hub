/**
 * Pie de paginacion del listado.
 *
 * Permite avanzar o retroceder. Que tramo se esta viendo del total lo dice
 * ResumenRegistros, encima de la tabla: aqui abajo solo quedan los controles.
 *
 * Solo anterior/siguiente, sin numeros de pagina: los numeros obligan a decidir
 * cuantos mostrar y como abreviar los del medio, y no resuelven nada que aqui
 * haga falta. Quien busca una incidencia concreta usa los filtros; quien revisa
 * el listado avanza de a una pagina.
 *
 * El componente no sabe pedir datos. Recibe la paginacion que devolvio el
 * backend y avisa hacia arriba cuando el usuario quiere otra pagina: asi la
 * pagina que lo usa sigue siendo la unica que habla con la API.
 */
export default function Paginacion({ paginacion, onCambiarPagina }) {
  const { pagina, paginas } = paginacion;

  // Con una sola pagina no hay nada que ofrecer. Se devuelve null en lugar de
  // dibujar los botones desactivados: un control que nunca va a servir es ruido.
  if (paginas <= 1) return null;

  return (
    <div className="paginacion">
      <div className="paginacion__controles">
        <button
          className="boton boton--discreto"
          type="button"
          onClick={() => onCambiarPagina(pagina - 1)}
          disabled={pagina <= 1}
        >
          Anterior
        </button>

        <span className="paginacion__posicion">
          P&aacute;gina {pagina} de {paginas}
        </span>

        <button
          className="boton boton--discreto"
          type="button"
          onClick={() => onCambiarPagina(pagina + 1)}
          disabled={pagina >= paginas}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
