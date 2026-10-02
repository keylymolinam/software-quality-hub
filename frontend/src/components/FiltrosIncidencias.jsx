/**
 * Barra de filtros del listado de incidencias.
 *
 * No pide datos ni sabe de la API: recibe los valores actuales y avisa hacia
 * arriba cada vez que uno cambia. Quien lo usa decide que hacer con eso (en la
 * pagina de incidencias, escribirlo en la direccion del navegador).
 *
 * Las listas de proyectos y usuarios tambien llegan como propiedades, por el
 * mismo motivo: si este componente las pidiera por su cuenta, dejaria de poder
 * dibujarse en una prueba sin un servidor detras.
 */
import { useEffect, useState } from 'react';

import { CATEGORIAS, ESTADOS, ORDENES, PRIORIDADES } from '../dominio/incidencias.js';

/** Milisegundos de espera antes de buscar mientras se escribe. */
const ESPERA_BUSQUEDA = 350;

export default function FiltrosIncidencias({
  valores,
  onCambiar,
  onLimpiar,
  proyectos,
  usuarios,
  hayFiltros,
}) {
  // El texto de busqueda se guarda aparte del resto de los filtros. Los demas
  // son desplegables: cambian de golpe y conviene pedir los datos de inmediato.
  // Escribir es distinto, y por eso necesita su propio estado (ver abajo).
  const [textoBusqueda, setTextoBusqueda] = useState(valores.busqueda);

  // Si la busqueda cambia desde afuera (el boton de limpiar, o el boton atras
  // del navegador), el cuadro de texto tiene que reflejarlo. Sin esto seguiria
  // mostrando lo que se habia escrito, contradiciendo a la tabla.
  useEffect(() => {
    setTextoBusqueda(valores.busqueda);
  }, [valores.busqueda]);

  // Se espera a que la persona deje de escribir antes de buscar. Sin esta
  // espera, "autenticacion" dispararia catorce peticiones, una por letra: se
  // castiga al servidor y, peor, la tabla parpadea con resultados intermedios
  // que nadie pidio.
  //
  // El temporizador se cancela en cada pulsacion (la limpieza del efecto), asi
  // que solo sobrevive el de la ultima letra escrita.
  useEffect(() => {
    if (textoBusqueda === valores.busqueda) return undefined;

    const temporizador = setTimeout(() => onCambiar('busqueda', textoBusqueda), ESPERA_BUSQUEDA);

    return () => clearTimeout(temporizador);
  }, [textoBusqueda, valores.busqueda, onCambiar]);

  return (
    <section className="filtros" aria-label="Filtros del listado">
      <div className="filtros__fila">
        <label className="campo campo--busqueda">
          <span className="campo__etiqueta">Buscar</span>
          <input
            className="campo__control"
            type="search"
            placeholder="T&iacute;tulo o descripci&oacute;n"
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
          />
        </label>

        <Desplegable
          etiqueta="Estado"
          valor={valores.estado}
          opciones={ESTADOS}
          onCambiar={(v) => onCambiar('estado', v)}
        />

        <Desplegable
          etiqueta="Prioridad"
          valor={valores.prioridad}
          opciones={PRIORIDADES}
          onCambiar={(v) => onCambiar('prioridad', v)}
        />

        <Desplegable
          etiqueta="Categor&iacute;a"
          valor={valores.categoria}
          opciones={CATEGORIAS}
          onCambiar={(v) => onCambiar('categoria', v)}
        />
      </div>

      <div className="filtros__fila">
        <Desplegable
          etiqueta="Proyecto"
          valor={valores.id_proyecto}
          // Los proyectos llegan del backend, asi que hay que adaptarlos a la
          // forma { valor, etiqueta } que usan las listas del dominio.
          opciones={proyectos.map((p) => ({
            valor: String(p.id_proyecto),
            etiqueta: p.nombre,
          }))}
          onCambiar={(v) => onCambiar('id_proyecto', v)}
        />

        <Desplegable
          etiqueta="Asignada a"
          valor={valores.asignado_a}
          opciones={usuarios.map((u) => ({
            valor: String(u.id_usuario),
            etiqueta: u.nombre,
          }))}
          onCambiar={(v) => onCambiar('asignado_a', v)}
        />

        <Desplegable
          etiqueta="Ordenar por"
          valor={valores.ordenarPor}
          opciones={ORDENES}
          // El orden siempre tiene un valor: no existe "sin ordenar", el
          // backend usa fecha_creacion cuando no se indica nada.
          sinVacio
          onCambiar={(v) => onCambiar('ordenarPor', v)}
        />

        <Desplegable
          etiqueta="Direcci&oacute;n"
          valor={valores.direccion}
          opciones={[
            { valor: 'DESC', etiqueta: 'Descendente' },
            { valor: 'ASC', etiqueta: 'Ascendente' },
          ]}
          sinVacio
          onCambiar={(v) => onCambiar('direccion', v)}
        />

        {/* Aparece solo cuando hay algo que limpiar: un boton que no haria nada
            no ayuda, y su ausencia ya informa que no hay filtros puestos. */}
        {hayFiltros && (
          <button className="boton boton--discreto filtros__limpiar" type="button" onClick={onLimpiar}>
            Limpiar filtros
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Desplegable de un filtro.
 *
 * Vive en este archivo y no en el suyo porque no se usa en otra parte: solo
 * existe para no repetir siete veces la misma estructura de label + select.
 *
 * @param {boolean} sinVacio  Oculta la opcion "Todas". La usan los filtros que
 *                            siempre tienen un valor, como el orden.
 */
function Desplegable({ etiqueta, valor, opciones, onCambiar, sinVacio = false }) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      <select className="campo__control" value={valor} onChange={(e) => onCambiar(e.target.value)}>
        {!sinVacio && <option value="">Todas</option>}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
