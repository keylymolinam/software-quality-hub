/**
 * Una incidencia como tarjeta del tablero.
 *
 * Muestra lo justo para decidir sin abrirla: numero, titulo, prioridad,
 * responsable y si el detector la marco como posible duplicado. El titulo es el
 * enlace al detalle, igual que en el listado.
 *
 * Se mueve de dos maneras, y las dos llegan al mismo `onMover`:
 *   - Arrastrandola a otra columna, que es lo que se espera de un tablero.
 *   - Con el menu "Mover a", para quien no puede arrastrar: en una pantalla
 *     tactil el arrastre del navegador no funciona, y con teclado tampoco.
 *
 * El menu usa <details>, que el navegador ya sabe abrir y cerrar con raton y
 * teclado sin una linea de JavaScript. Las opciones salen de
 * `transiciones_posibles`, que manda el backend: la tarjeta no decide que
 * movimientos son legales.
 */
import { Link, useLocation } from 'react-router-dom';

import EtiquetaPrioridad from './EtiquetaPrioridad.jsx';
import { accionDe, ESTADOS, etiquetaDe } from '../dominio/incidencias.js';
import { estadoDesde } from '../dominio/origen.js';

export default function TarjetaIncidencia({ incidencia, onMover, onArrastrar, onSoltar, deshabilitada }) {
  // El enlace al detalle anota que se vino del tablero, con sus filtros, para
  // que "Volver" regrese aqui y no a la lista. Ver dominio/origen.js.
  const location = useLocation();
  const posibles = incidencia.transiciones_posibles ?? [];

  return (
    <article
      className="tarjeta-incidencia"
      draggable={!deshabilitada && posibles.length > 0}
      onDragStart={(evento) => {
        // El id viaja tambien en dataTransfer porque Firefox no inicia el
        // arrastre si no se le entrega algun dato, aunque la pantalla no lo lea.
        evento.dataTransfer.setData('text/plain', String(incidencia.id_incidencia));
        evento.dataTransfer.effectAllowed = 'move';
        onArrastrar(incidencia);
      }}
      onDragEnd={onSoltar}
    >
      <div className="tarjeta-incidencia__cabecera">
        <span className="tarjeta-incidencia__numero">#{incidencia.id_incidencia}</span>
        <EtiquetaPrioridad prioridad={incidencia.prioridad} />
      </div>

      <Link
        className="tarjeta-incidencia__titulo"
        to={`/incidencias/${incidencia.id_incidencia}`}
        state={estadoDesde(location)}
      >
        {incidencia.titulo}
      </Link>

      {(incidencia.posible_duplicado_de || incidencia.duplicados_detectados?.length > 0) && (
        <span className="marca marca--duplicado tarjeta-incidencia__marca">
          {incidencia.posible_duplicado_de
            ? `Posible duplicado de #${incidencia.posible_duplicado_de}`
            : 'Tiene un posible duplicado'}
        </span>
      )}

      <div className="tarjeta-incidencia__pie">
        <span className={incidencia.asignado_a_nombre ? 'tarjeta-incidencia__persona' : 'sin-dato'}>
          {incidencia.asignado_a_nombre ?? 'Sin asignar'}
        </span>

        {posibles.length > 0 && (
          <details className="tarjeta-incidencia__mover">
            <summary>Mover a</summary>
            <ul className="tarjeta-incidencia__opciones">
              {posibles.map((destino) => (
                <li key={destino}>
                  <button
                    type="button"
                    className="tarjeta-incidencia__opcion"
                    disabled={deshabilitada}
                    onClick={(evento) => {
                      // Cerrar el menu al elegir, como cualquier desplegable.
                      evento.currentTarget.closest('details').open = false;
                      onMover(incidencia, destino);
                    }}
                  >
                    <span>{accionDe(incidencia.estado, destino).etiqueta}</span>
                    <span className="tarjeta-incidencia__destino">
                      &rarr; {etiquetaDe(ESTADOS, destino)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}
