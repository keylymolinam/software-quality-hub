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
 *
 * TRES FILTROS A LA VISTA Y EL RESTO EN "MAS FILTROS"
 *
 * Antes se mostraban los siete desplegables a la vez, y dos participantes de
 * la prueba de usuarios (P1 y P2) los encontraron amontonados. A la vista
 * quedan Estado, Prioridad y Proyecto: son las tres preguntas que mas se hace
 * un equipo (en que va, que tan urgente es, de donde viene) y justo las que
 * pedia la tarea 3 de esa prueba. Categoria, asignacion y orden pasan a un
 * panel que se abre con un boton.
 *
 * Se descarto esconder los filtros sin aviso: una lista filtrada por algo que
 * no se ve parece incompleta y nadie sabe por que. Por eso el boton cuenta
 * cuantos filtros ocultos estan en uso, y el panel parte abierto si hay alguno.
 */
import { useEffect, useState } from 'react';

import { CATEGORIAS, ESTADOS, ORDENES, PRIORIDADES } from '../dominio/incidencias.js';

/** Milisegundos de espera antes de buscar mientras se escribe. */
const ESPERA_BUSQUEDA = 350;

/** Orden que usa el backend cuando no se indica otro; no cuenta como filtro. */
const ORDEN_POR_DEFECTO = { ordenarPor: 'fecha_creacion', direccion: 'DESC' };

/**
 * Cuantos de los filtros del panel "Mas filtros" estan en uso.
 *
 * El orden cuenta solo si se aparta del de siempre: tiene un valor aunque nadie
 * lo haya tocado, y contarlo siempre dejaria el aviso encendido sin motivo.
 */
function contarOcultosEnUso(valores) {
  return [
    valores.categoria !== '',
    valores.asignado_a !== '',
    valores.posible_duplicado !== '',
    valores.ordenarPor !== ORDEN_POR_DEFECTO.ordenarPor ||
      valores.direccion !== ORDEN_POR_DEFECTO.direccion,
  ].filter(Boolean).length;
}

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

  const ocultosEnUso = contarOcultosEnUso(valores);

  // Abierto o cerrado vive en useState y no en la direccion, a diferencia de
  // los filtros: no cambia que incidencias se ven, solo cuanto ocupa la barra.
  // En la direccion, el boton atras abriria y cerraria el panel, que no es lo
  // que alguien espera al volver. Parte abierto si llega un enlace que ya usa
  // un filtro oculto, para que se vea por que la lista es la que es.
  const [masFiltrosAbierto, setMasFiltrosAbierto] = useState(() => ocultosEnUso > 0);

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

        <button
          className="boton boton--discreto filtros__mas"
          type="button"
          aria-expanded={masFiltrosAbierto}
          aria-controls="filtros-adicionales"
          onClick={() => setMasFiltrosAbierto((abierto) => !abierto)}
        >
          {masFiltrosAbierto ? '- Menos filtros' : '+ M\u00e1s filtros'}
          {ocultosEnUso > 0 && ` (${ocultosEnUso})`}
        </button>

        {/* Aparece solo cuando hay algo que limpiar: un boton que no haria nada
            no ayuda, y su ausencia ya informa que no hay filtros puestos. */}
        {hayFiltros && (
          <button className="boton boton--discreto filtros__limpiar" type="button" onClick={onLimpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      {masFiltrosAbierto && (
        <div className="filtros__fila" id="filtros-adicionales">
          <Desplegable
            etiqueta="Categor&iacute;a"
            valor={valores.categoria}
            opciones={CATEGORIAS}
            onCambiar={(v) => onCambiar('categoria', v)}
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

          {/* Es el destino del enlace "Ver todos los posibles duplicados" del
              detalle, que llega con ?posible_duplicado=1 y abre este panel. */}
          <Desplegable
            etiqueta="Duplicados"
            valor={valores.posible_duplicado}
            opciones={[{ valor: '1', etiqueta: 'Solo posibles duplicados' }]}
            onCambiar={(v) => onCambiar('posible_duplicado', v)}
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
        </div>
      )}
    </section>
  );
}

/**
 * Desplegable de un filtro.
 *
 * Vive en este archivo y no en el suyo porque no se usa en otra parte: solo
 * existe para no repetir la misma estructura de label + select.
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
