/**
 * Cuadro que pide el motivo antes de un cambio de estado que lo exige (los
 * rechazos: cerrar sin resolver).
 *
 * Nacio dentro del tablero y salio a su propio archivo cuando la lista empezo a
 * cambiar estados desde la tabla: las dos vistas tienen que pedir el motivo
 * igual, y dos copias del mismo cuadro terminan diferenciandose con el tiempo.
 *
 * El motivo es obligatorio en las dos capas: `required` aqui, para avisar sin
 * viajar al servidor, y TRANSICIONES_QUE_EXIGEN_MOTIVO en el backend, que es la
 * regla de verdad. Un cierre sin explicacion deja la bitacora muda.
 *
 * El texto escrito vive aqui adentro: a quien lo abre solo le interesa el motivo
 * terminado, al confirmar.
 */
import { useState } from 'react';

import { accionDe } from '../dominio/incidencias.js';

export default function DialogoMotivo({ incidencia, destino, enviando, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState('');
  const { etiqueta } = accionDe(incidencia.estado, destino);

  function confirmar(evento) {
    evento.preventDefault();
    onConfirmar(motivo);
  }

  return (
    <div className="modal" role="presentation">
      <form
        className="modal__cuadro tarjeta"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-motivo"
        onSubmit={confirmar}
      >
        <h2 id="titulo-motivo">
          {etiqueta} #{incidencia.id_incidencia}
        </h2>
        <p className="subtitulo">{incidencia.titulo}</p>

        <label className="campo">
          <span className="campo__etiqueta">Motivo (obligatorio)</span>
          <textarea
            className="campo__control campo__control--area"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Por ejemplo: duplicada de la #1, no es un defecto, no se reproduce."
            required
            autoFocus
          />
        </label>

        <div className="acciones__confirmar">
          <button className="boton boton--primario boton--auto" type="submit" disabled={enviando}>
            {enviando ? 'Guardando...' : etiqueta}
          </button>
          <button
            className="boton boton--discreto boton--auto"
            type="button"
            onClick={onCancelar}
            disabled={enviando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
