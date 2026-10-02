/**
 * Tabla del listado de incidencias.
 *
 * Se usa una tabla de verdad (<table>, <th>, <td>) y no una rejilla de <div>:
 * los datos son tabulares, y el lector de pantalla necesita los encabezados
 * para poder anunciar "Estado: Abierta" al recorrer una fila. Con divs esa
 * relacion entre celda y encabezado no existe.
 *
 * Las dos columnas de la derecha muestran lo que aportan los diferenciadores
 * del proyecto: si la clasificacion la puso el motor y si hay un posible
 * duplicado. Son la razon de ser del sistema, asi que se ven en el listado y no
 * escondidas en el detalle.
 */
import { Link } from 'react-router-dom';

import EtiquetaEstado from './EtiquetaEstado.jsx';
import EtiquetaPrioridad from './EtiquetaPrioridad.jsx';
import { CATEGORIAS, etiquetaDe, formatearFecha } from '../dominio/incidencias.js';

export default function TablaIncidencias({ incidencias, hayFiltros }) {
  if (incidencias.length === 0) {
    // Se distinguen los dos vacios posibles, porque piden cosas distintas:
    // sin filtros hay que registrar la primera incidencia; con filtros hay que
    // aflojarlos. Un unico mensaje "no hay resultados" dejaria a quien filtro
    // de mas pensando que el sistema esta vacio.
    return (
      <p className="vacio">
        {hayFiltros
          ? 'Ninguna incidencia coincide con los filtros aplicados.'
          : 'Todav\u00eda no hay incidencias registradas.'}
      </p>
    );
  }

  return (
    <div className="tabla-contenedor">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col" className="tabla__num">#</th>
            <th scope="col">T&iacute;tulo</th>
            <th scope="col">Proyecto</th>
            <th scope="col">Estado</th>
            <th scope="col">Prioridad</th>
            <th scope="col">Categor&iacute;a</th>
            <th scope="col">Asignada a</th>
            <th scope="col">Creada</th>
          </tr>
        </thead>

        <tbody>
          {incidencias.map((incidencia) => (
            <tr key={incidencia.id_incidencia}>
              <td className="tabla__num">{incidencia.id_incidencia}</td>

              <td>
                {/* El titulo es el enlace al detalle, y no el numero: es lo que
                    identifica la incidencia para quien la lee, y da un area de
                    clic grande. El numero queda como referencia para nombrarla
                    en voz alta o en un comentario. */}
                <Link className="tabla__titulo" to={`/incidencias/${incidencia.id_incidencia}`}>
                  {incidencia.titulo}
                </Link>

                {/* Los avisos van bajo el titulo y no en columnas propias: son
                    la excepcion y no el caso habitual, y dos columnas casi
                    siempre vacias solo estrechan el resto de la tabla. */}
                {(incidencia.posible_duplicado_de || incidencia.clasificacion_automatica === 1) && (
                  <span className="tabla__marcas">
                    {incidencia.posible_duplicado_de && (
                      <span
                        className="marca marca--duplicado"
                        title={
                          'El detector de duplicados encontr\u00f3 similitud con la incidencia ' +
                          `#${incidencia.posible_duplicado_de}. Es un aviso, no una certeza.`
                        }
                      >
                        Posible duplicado de #{incidencia.posible_duplicado_de}
                      </span>
                    )}

                    {incidencia.clasificacion_automatica === 1 && (
                      <span
                        className="marca marca--automatica"
                        title="La categor&iacute;a y la prioridad las dedujo el motor de clasificaci&oacute;n, no una persona."
                      >
                        Clasificada autom&aacute;ticamente
                      </span>
                    )}
                  </span>
                )}
              </td>

              <td>{incidencia.proyecto_nombre}</td>
              <td><EtiquetaEstado estado={incidencia.estado} /></td>
              <td><EtiquetaPrioridad prioridad={incidencia.prioridad} /></td>
              <td className="tabla__categoria">{etiquetaDe(CATEGORIAS, incidencia.categoria)}</td>

              {/* asignado_a puede ser NULL: una incidencia sin asignar debe
                  verse como tal, no como una celda en blanco que parece un
                  error de carga. */}
              <td>
                {incidencia.asignado_a_nombre ?? <span className="sin-dato">Sin asignar</span>}
              </td>

              <td className="tabla__fecha">{formatearFecha(incidencia.fecha_creacion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
