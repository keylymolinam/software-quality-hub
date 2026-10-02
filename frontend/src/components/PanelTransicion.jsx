/**
 * Acciones de cambio de estado de una incidencia.
 *
 * Dibuja un boton por cada transicion permitida y, al elegir una, pide el
 * motivo antes de ejecutarla. Es la pieza que hace visible la maquina de
 * estados: lo que no se puede hacer no aparece.
 *
 * ---------------------------------------------------------------------------
 * POR QUE DOS PASOS Y NO UN SOLO CLIC
 *
 * Elegir la transicion y confirmarla estan separados por dos razones:
 *
 *   - Cada cambio escribe la bitacora, y algunos no se deshacen: CERRADA es un
 *     estado final. Un clic unico convierte un roce del raton en un cierre
 *     definitivo.
 *   - El motivo tiene que escribirse en algun momento, y en ABIERTA -> CERRADA
 *     es obligatorio. Mostrar el cuadro de texto solo despues de elegir evita
 *     tener un formulario permanente que no se sabe a cual de los botones
 *     acompana.
 *
 * ---------------------------------------------------------------------------
 * DE QUIEN ES CADA COSA
 *
 * Este componente es dueno del formulario (que transicion esta elegida y que
 * motivo se escribio). La peticion la hace la pagina, que recibe la respuesta y
 * decide como recargar los datos. Por eso `onEjecutar` devuelve si funciono:
 * sin ese dato el panel no sabria si dejar el formulario como estaba para
 * corregirlo o limpiarlo porque el cambio ya ocurrio.
 */
import { useState } from 'react';

import { accionDe, etiquetaDe, ESTADOS } from '../dominio/incidencias.js';

export default function PanelTransicion({ estado, transicionesPosibles, onEjecutar, enviando, error }) {
  // Transicion elegida, a la espera de confirmacion. null = ninguna elegida.
  const [destino, setDestino] = useState(null);
  const [comentario, setComentario] = useState('');

  // Un estado final no tiene nada que ofrecer. Se dice en palabras en lugar de
  // esconder la seccion: quien busca el boton de reabrir necesita saber que no
  // existe, no quedarse pensando que no lo encuentra.
  if (transicionesPosibles.length === 0) {
    return (
      <section className="tarjeta acciones">
        <h2>Cambiar el estado</h2>
        <p className="ayuda ayuda--neutra">
          La incidencia est&aacute; <strong>{etiquetaDe(ESTADOS, estado).toLowerCase()}</strong> y
          ese es un estado final: no admite m&aacute;s cambios.
        </p>
      </section>
    );
  }

  const accion = destino ? accionDe(estado, destino) : null;

  function elegir(estadoDestino) {
    setDestino(estadoDestino);
    // El motivo se limpia al cambiar de accion: un texto escrito para "cerrar
    // sin resolver" no describe un "tomar y empezar", y arrastrarlo dejaria en
    // la bitacora una explicacion que no corresponde al cambio.
    setComentario('');
  }

  function cancelar() {
    setDestino(null);
    setComentario('');
  }

  async function confirmar(evento) {
    evento.preventDefault();

    const funciono = await onEjecutar({ estado: destino, comentario });

    if (funciono) cancelar();
  }

  return (
    <section className="tarjeta acciones">
      <h2>Cambiar el estado</h2>

      <div className="acciones__botones">
        {transicionesPosibles.map((estadoDestino) => {
          const posible = accionDe(estado, estadoDestino);

          return (
            <button
              key={estadoDestino}
              className={
                estadoDestino === destino
                  ? 'boton boton--primario boton--auto'
                  : 'boton boton--discreto boton--auto'
              }
              type="button"
              onClick={() => elegir(estadoDestino)}
              disabled={enviando}
            >
              {posible.etiqueta}
            </button>
          );
        })}
      </div>

      {destino && (
        <form className="acciones__confirmacion" onSubmit={confirmar}>
          <label className={`campo${error?.mensajeDe('comentario') ? ' campo--con-error' : ''}`}>
            <span className="campo__etiqueta">
              Motivo {accion.exigeMotivo ? '(obligatorio)' : '(opcional)'}
            </span>
            <textarea
              className="campo__control campo__control--area"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={
                accion.exigeMotivo
                  ? 'Por qu\u00e9 se cierra sin resolver. Por ejemplo: duplicada de la #1.'
                  : 'Queda en la bit\u00e1cora a tu nombre.'
              }
              /* El `required` del navegador se apoya en la misma tabla que las
                 etiquetas, no en el servidor. Es una comodidad: si acertara mal,
                 el backend responde 400 y el mensaje aparece aqui abajo. */
              required={accion.exigeMotivo}
              autoFocus
            />
            {error?.mensajeDe('comentario') && (
              <span className="campo__error">{error.mensajeDe('comentario')}</span>
            )}
          </label>

          <div className="acciones__confirmar">
            <button className="boton boton--primario boton--auto" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : accion.etiqueta}
            </button>
            <button
              className="boton boton--discreto boton--auto"
              type="button"
              onClick={cancelar}
              disabled={enviando}
            >
              Cancelar
            </button>
          </div>

          <p className="ayuda ayuda--neutra">
            El cambio queda registrado en la bit&aacute;cora con tu nombre y la hora. Quien lo
            hace se toma de la sesi&oacute;n, no del formulario.
          </p>
        </form>
      )}
    </section>
  );
}
