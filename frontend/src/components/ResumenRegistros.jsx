/**
 * Resumen de registros del listado: cuantas incidencias hay y que tramo se ve.
 *
 * Va encima de la tabla y no al pie, donde estuvo primero. Al pie solo lo veia
 * quien llegaba al final de la pagina, y la cuenta es lo primero que se quiere
 * saber despues de filtrar: "cuantas quedaron". Es la convencion de los sistemas
 * de tickets, y la pidio la autora al revisar la pantalla.
 *
 * El total es el del backend (todas las que calzan con los filtros), no el de las
 * filas recibidas: con veinte por pagina, contar las filas diria siempre veinte.
 *
 * Con cero resultados no dibuja nada: la tabla ya dice que no hay incidencias, y
 * "0 incidencias" encima de ese mensaje lo repetiria.
 */
export default function ResumenRegistros({ paginacion }) {
  const { total, pagina, limite, paginas } = paginacion;

  if (total === 0) return null;

  const sustantivo = total === 1 ? 'incidencia' : 'incidencias';

  // Con una sola pagina el tramo es todo el total, y "Mostrando 1-7 de 7" dice
  // lo mismo dos veces.
  if (paginas <= 1) {
    return <p className="resumen-registros">{total} {sustantivo}</p>;
  }

  // Contando desde 1, como lo ve la persona; la ultima pagina casi nunca viene
  // completa, por eso el final se recorta con el total.
  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(pagina * limite, total);

  return (
    <p className="resumen-registros">
      Mostrando {desde}&ndash;{hasta} de {total} {sustantivo}
    </p>
  );
}
