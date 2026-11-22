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
 *
 * Para que no se lea como una planilla plana, cada fila agrupa y distingue:
 *   - Proyecto y categoria van en una linea chica bajo el titulo, en vez de dos
 *     columnas propias. Describen la incidencia, no se comparan entre filas, y
 *     asi el titulo gana ancho.
 *   - La prioridad alta y la media llevan una franja de color en el borde
 *     izquierdo, que se ve al recorrer la tabla sin leer la columna. La columna
 *     sigue ahi, con el nombre escrito, para quien no distingue el color.
 *   - Quien la tiene asignada aparece con un circulo de iniciales, como en el
 *     menu lateral.
 *   - La fecha dice cuanto hace ("hace 3 dias") y debajo la fecha exacta.
 *
 * ---------------------------------------------------------------------------
 * EDICION EN LA MISMA TABLA
 *
 * Estado, prioridad y asignacion se cambian desde la fila, sin entrar al
 * detalle: lo pidio la autora, al estilo de Monday. La etiqueta se ve igual que
 * siempre, con una flecha, y encima lleva un <select> invisible que la cubre
 * entera. Al pulsarla se abre la lista nativa del navegador. Se eligio asi y no
 * un menu propio porque el select nativo ya resuelve el teclado, el lector de
 * pantalla y el celular, y la etiqueta de colores sigue siendo lo que se ve.
 *
 * El estado no es un campo mas: solo ofrece las transiciones que el backend
 * mando en `transiciones_posibles`, igual que el tablero y el detalle, y una
 * incidencia cerrada no ofrece nada. Los rechazos piden motivo, pero eso lo
 * resuelve la pagina con el mismo cuadro del tablero: esta tabla solo avisa
 * hacia arriba que se eligio un destino.
 *
 * Sin onActualizar la tabla se dibuja solo para leer, como antes.
 */
import { Link, useLocation } from 'react-router-dom';

import Editable from './Editable.jsx';
import EtiquetaEstado from './EtiquetaEstado.jsx';
import EtiquetaPrioridad from './EtiquetaPrioridad.jsx';
import { estadoDesde } from '../dominio/origen.js';
import {
  accionDe,
  CATEGORIAS,
  ESTADOS,
  etiquetaDe,
  PRIORIDADES,
  formatearFecha,
  haceCuanto,
  inicialesDe,
} from '../dominio/incidencias.js';

/** Quien la tiene asignada, con su circulo de iniciales, o "Sin asignar". */
function Asignada({ nombre }) {
  return nombre ? (
    <span className="persona">
      <span className="persona__avatar" aria-hidden="true">
        {inicialesDe(nombre)}
      </span>
      {nombre}
    </span>
  ) : (
    <span className="sin-dato">Sin asignar</span>
  );
}

export default function TablaIncidencias({
  incidencias,
  hayFiltros,
  usuarios = [],
  onActualizar,
  onCambiarEstado,
  ocupada = false,
}) {
  const editable = Boolean(onActualizar);
  // Cada enlace a una incidencia anota desde donde se fue (la lista, con sus
  // filtros), para que el detalle sepa a donde volver. Ver dominio/origen.js.
  const origen = estadoDesde(useLocation());

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
            <th scope="col">Estado</th>
            <th scope="col">Prioridad</th>
            <th scope="col">Asignada a</th>
            <th scope="col">Creada</th>
          </tr>
        </thead>

        <tbody>
          {incidencias.map((incidencia) => (
            <tr
              key={incidencia.id_incidencia}
              className={`tabla__fila tabla__fila--${String(incidencia.prioridad).toLowerCase()}`}
            >
              <td className="tabla__num">{incidencia.id_incidencia}</td>

              <td>
                {/* El titulo es el enlace al detalle, y no el numero: es lo que
                    identifica la incidencia para quien la lee, y da un area de
                    clic grande. El numero queda como referencia para nombrarla
                    en voz alta o en un comentario. */}
                <Link
                  className="tabla__titulo"
                  to={`/incidencias/${incidencia.id_incidencia}`}
                  state={origen}
                >
                  {incidencia.titulo}
                </Link>

                <span className="tabla__meta">
                  {incidencia.proyecto_nombre} &middot;{' '}
                  {etiquetaDe(CATEGORIAS, incidencia.categoria)}
                </span>

                {/* Los avisos van bajo el titulo y no en columnas propias: son
                    la excepcion y no el caso habitual, y dos columnas casi
                    siempre vacias solo estrechan el resto de la tabla. */}
                {/* Las marcas de duplicado son enlaces a la otra mitad de la
                    pareja: lo primero que se quiere al verlas es comparar. Antes
                    eran texto con un title, y en la revision de la autora se
                    vio el problema: el cursor de ayuda invitaba a pulsar, el
                    globo del navegador no se puede estilizar y pulsar no hacia
                    nada. La explicacion larga sigue en el detalle. */}
                {(incidencia.posible_duplicado_de ||
                  incidencia.duplicados_detectados?.length > 0 ||
                  incidencia.clasificacion_automatica === 1) && (
                  <span className="tabla__marcas">
                    {incidencia.posible_duplicado_de && (
                      <Link
                        className="marca marca--duplicado"
                        to={`/incidencias/${incidencia.posible_duplicado_de}`}
                        state={origen}
                      >
                        Posible duplicado de #{incidencia.posible_duplicado_de}
                      </Link>
                    )}

                    {incidencia.duplicados_detectados?.map((idDuplicado) => (
                      <Link
                        key={idDuplicado}
                        className="marca marca--duplicado"
                        to={`/incidencias/${idDuplicado}`}
                        state={origen}
                      >
                        Tiene un posible duplicado: #{idDuplicado}
                      </Link>
                    ))}

                    {incidencia.clasificacion_automatica === 1 && (
                      <span className="marca marca--automatica">
                        Clasificada autom&aacute;ticamente
                      </span>
                    )}
                  </span>
                )}
              </td>

              <td>
                {/* Una cerrada no tiene a donde ir: se ve la etiqueta sola, sin
                    flecha, para no ofrecer un menu que solo repetiria su estado. */}
                {editable && incidencia.transiciones_posibles?.length > 0 ? (
                  <Editable
                    etiqueta={`Cambiar estado de #${incidencia.id_incidencia}`}
                    valor={incidencia.estado}
                    deshabilitado={ocupada}
                    opciones={[
                      { valor: incidencia.estado, etiqueta: etiquetaDe(ESTADOS, incidencia.estado) },
                      ...incidencia.transiciones_posibles.map((destino) => ({
                        valor: destino,
                        etiqueta: `${accionDe(incidencia.estado, destino).etiqueta} \u2192 ${etiquetaDe(ESTADOS, destino)}`,
                      })),
                    ]}
                    onElegir={(destino) => onCambiarEstado(incidencia, destino)}
                  >
                    <EtiquetaEstado estado={incidencia.estado} />
                  </Editable>
                ) : (
                  <EtiquetaEstado estado={incidencia.estado} />
                )}
              </td>

              <td>
                {editable ? (
                  <Editable
                    etiqueta={`Cambiar prioridad de #${incidencia.id_incidencia}`}
                    valor={incidencia.prioridad}
                    deshabilitado={ocupada}
                    opciones={PRIORIDADES}
                    onElegir={(prioridad) => onActualizar(incidencia, { prioridad })}
                  >
                    <EtiquetaPrioridad prioridad={incidencia.prioridad} />
                  </Editable>
                ) : (
                  <EtiquetaPrioridad prioridad={incidencia.prioridad} />
                )}
              </td>

              {/* asignado_a puede ser NULL: una incidencia sin asignar debe
                  verse como tal, no como una celda en blanco que parece un
                  error de carga. Elegir "Sin asignar" envia null, que el
                  backend entiende como desasignar. */}
              <td>
                {editable ? (
                  <Editable
                    etiqueta={`Cambiar a qui\u00e9n est\u00e1 asignada #${incidencia.id_incidencia}`}
                    valor={incidencia.asignado_a ? String(incidencia.asignado_a) : ''}
                    deshabilitado={ocupada}
                    opciones={[
                      { valor: '', etiqueta: 'Sin asignar' },
                      ...usuarios.map((u) => ({ valor: String(u.id_usuario), etiqueta: u.nombre })),
                    ]}
                    onElegir={(valor) =>
                      onActualizar(incidencia, { asignado_a: valor === '' ? null : Number(valor) })
                    }
                  >
                    <Asignada nombre={incidencia.asignado_a_nombre} />
                  </Editable>
                ) : (
                  <Asignada nombre={incidencia.asignado_a_nombre} />
                )}
              </td>

              <td className="tabla__fecha">
                {haceCuanto(incidencia.fecha_creacion)}
                <span className="tabla__fecha-exacta">
                  {formatearFecha(incidencia.fecha_creacion)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
