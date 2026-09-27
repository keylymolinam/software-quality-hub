/**
 * Pie de paginacion del listado.
 *
 * Muestra que tramo se esta viendo del total y permite avanzar o retroceder.
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
  const { total, pagina, limite, paginas } = paginacion;

  // Con una sola pagina no hay nada que ofrecer. Se devuelve null en lugar de
  // dibujar los botones desactivados: un control que nunca va a servir es ruido.
  if (paginas <= 1) {
    return <p className="paginacion__resumen">{total} incidencias</p>;
  }

  // Tramo que se esta viendo, contando desde 1 para que coincida con lo que la
  // persona ve en la tabla. El final se recorta con el total, porque la ultima
  // pagina casi nunca viene completa.
  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(pagina * limite, total);

  return (
    <div className="paginacion">
      <p className="paginacion__resumen">
        Mostrando {desde}-{hasta} de {total}
      </p>

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
          Pagina {pagina} de {paginas}
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
