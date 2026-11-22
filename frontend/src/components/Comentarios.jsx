/**
 * Comentarios de una incidencia: la conversacion del equipo y el cuadro para
 * sumarse a ella. Lo pidio la autora para que las personas dejen comentarios
 * en el detalle.
 *
 * Va entre la descripcion y la bitacora porque se lee igual que ellas, de
 * arriba hacia abajo: que se reporto, que se ha conversado, que ha pasado. El
 * cuadro para escribir queda al final de la conversacion, como en un chat:
 * quien responde ya leyo lo anterior.
 *
 * Pide sus propios datos (con su propia clave) en vez de recibirlos del
 * detalle: publicar un comentario solo tiene que recargar los comentarios, no
 * la incidencia ni su bitacora, que no cambian.
 *
 * Un comentario no se edita ni se borra (ver comentario.model.js en el
 * backend), asi que no hay botones para eso.
 */
import { useRef, useState } from 'react';

import { agregarComentario, listarComentarios } from '../api/incidencias.js';
import { formatearFechaHora, haceCuanto, inicialesDe } from '../dominio/incidencias.js';
import { usePeticion } from '../hooks/usePeticion.js';

export default function Comentarios({ idIncidencia }) {
  // Cambia tras publicar, para volver a pedir la conversacion.
  const [version, setVersion] = useState(0);
  const comentarios = usePeticion(
    () => listarComentarios(idIncidencia),
    `comentarios-${idIncidencia}-${version}`
  );

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const formulario = useRef(null);

  async function publicar(evento) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await agregarComentario(idIncidencia, texto);
      setTexto('');
      setVersion((n) => n + 1);
    } catch (fallo) {
      // Se conserva lo escrito: perder un comentario largo por un error de
      // red seria peor que el error mismo.
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  }

  // Ctrl + Enter publica, como en la mayoria de las herramientas de equipo.
  // Enter solo no, porque un comentario suele tener varias lineas.
  function alPresionar(evento) {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      formulario.current?.requestSubmit();
    }
  }

  const lista = comentarios.datos?.comentarios ?? [];
  const errorDelTexto = error?.mensajeDe?.('texto');

  return (
    <section className="tarjeta">
      <h2>
        Comentarios{comentarios.datos && lista.length > 0 ? ` (${lista.length})` : ''}
      </h2>

      {comentarios.error && (
        <p className="alerta alerta--error">
          {comentarios.error.message}{' '}
          <button className="enlace-boton" type="button" onClick={comentarios.reintentar}>
            Reintentar
          </button>
        </p>
      )}

      {comentarios.cargando && !comentarios.datos && (
        <p className="estado estado--cargando">Cargando los comentarios...</p>
      )}

      {comentarios.datos && lista.length === 0 && (
        <p className="vacio vacio--discreto">
          Nadie ha comentado todav&iacute;a. Una pregunta, un avance o los pasos para
          reproducir ayudan a quien la tome despu&eacute;s.
        </p>
      )}

      {lista.length > 0 && (
        <ol className={`comentarios${comentarios.cargando ? ' cargando-suave' : ''}`}>
          {lista.map((comentario) => (
            <li className="comentario" key={comentario.id_comentario}>
              <span className="persona__avatar" aria-hidden="true">
                {inicialesDe(comentario.autor_nombre)}
              </span>
              <div className="comentario__cuerpo">
                <p className="comentario__cabecera">
                  <strong>{comentario.autor_nombre}</strong>
                  <time dateTime={comentario.fecha_creacion}>
                    {haceCuanto(comentario.fecha_creacion)} &middot;{' '}
                    {formatearFechaHora(comentario.fecha_creacion)}
                  </time>
                </p>
                <p className="comentario__texto">{comentario.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form className="comentarios__nuevo" onSubmit={publicar} ref={formulario}>
        <label className={`campo${errorDelTexto ? ' campo--con-error' : ''}`}>
          <span className="campo__etiqueta">Escribe un comentario</span>
          <textarea
            className="campo__control campo__control--area"
            rows={3}
            maxLength={2000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alPresionar}
            placeholder="Una pregunta, un avance, los pasos para reproducir..."
          />
          {errorDelTexto && <span className="campo__error">{errorDelTexto}</span>}
        </label>

        {error && !errorDelTexto && <p className="alerta alerta--error">{error.message}</p>}

        <div className="comentarios__acciones">
          <span className="campo__ayuda">Ctrl + Enter para publicar</span>
          <button
            className="boton boton--primario boton--auto"
            type="submit"
            disabled={enviando || texto.trim() === ''}
          >
            {enviando ? 'Publicando...' : 'Comentar'}
          </button>
        </div>
      </form>
    </section>
  );
}
