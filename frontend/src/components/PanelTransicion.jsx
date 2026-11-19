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
 *
 * ---------------------------------------------------------------------------
 * UNA ETIQUETA CON MENU EN VEZ DE UNA FILA DE BOTONES
 *
 * Antes cada transicion era un boton suelto. La autora lo encontro anticuado,
 * y es la forma en que lo resuelven las herramientas actuales de seguimiento:
 * el estado es una etiqueta y al pulsarla se despliega lo que se puede hacer.
 * Cada opcion dice ademas a que estado lleva ("Validar -> Validada"), que es
 * justo lo que en la prueba de usuarios no se entendia de los botones.
 *
 * Las opciones se dibujan siempre y se esconden con `hidden` en vez de
 * montarse al abrir: el menu queda en el HTML aunque este cerrado, y las
 * pruebas de pantallas, que no pueden pulsar nada, siguen viendo que acciones
 * ofrece cada estado.
 */
import { useEffect, useRef, useState } from 'react';

import EtiquetaEstado from './EtiquetaEstado.jsx';
import { accionDe, etiquetaDe, ESTADOS } from '../dominio/incidencias.js';

export default function PanelTransicion({ estado, transicionesPosibles, onEjecutar, enviando, error }) {
  // Transicion elegida, a la espera de confirmacion. null = ninguna elegida.
  const [destino, setDestino] = useState(null);
  const [comentario, setComentario] = useState('');

  const [menuAbierto, setMenuAbierto] = useState(false);
  const selector = useRef(null);
  const disparador = useRef(null);

  // Con el menu abierto: el foco va a la primera opcion, Escape lo cierra y
  // devuelve el foco a la etiqueta, y un clic fuera tambien lo cierra. Es lo
  // que se espera de cualquier menu desplegable; sin esto quedaria abierto
  // tapando la pantalla hasta volver a pulsar la etiqueta.
  useEffect(() => {
    if (!menuAbierto) return undefined;

    selector.current?.querySelector('[role="menuitem"]')?.focus();

    function alPulsarFuera(evento) {
      if (!selector.current?.contains(evento.target)) setMenuAbierto(false);
    }

    function alPulsarTecla(evento) {
      if (evento.key === 'Escape') {
        setMenuAbierto(false);
        disparador.current?.focus();
      }
    }

    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alPulsarTecla);

    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [menuAbierto]);

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
    setMenuAbierto(false);
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

      <div className="selector-estado" ref={selector}>
        <button
          ref={disparador}
          className="selector-estado__boton"
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuAbierto}
          aria-controls="menu-estado"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          disabled={enviando}
        >
          <EtiquetaEstado estado={estado} />
          <span className="selector-estado__texto">Cambiar estado</span>
          <span className="selector-estado__flecha" aria-hidden="true">
            &#9662;
          </span>
        </button>

        <ul className="selector-estado__menu" id="menu-estado" role="menu" hidden={!menuAbierto}>
          {transicionesPosibles.map((estadoDestino) => {
            const posible = accionDe(estado, estadoDestino);

            return (
              <li key={estadoDestino} role="none">
                <button
                  className="selector-estado__opcion"
                  type="button"
                  role="menuitem"
                  onClick={() => elegir(estadoDestino)}
                >
                  <span className="selector-estado__accion">{posible.etiqueta}</span>
                  <span className="selector-estado__destino">
                    &rarr; {etiquetaDe(ESTADOS, estadoDestino)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
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
