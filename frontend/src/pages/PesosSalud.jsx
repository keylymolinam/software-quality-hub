/**
 * Pesos del indice de salud: cuanto cuenta cada medicion, y quien lo decidio.
 *
 * La pidio la autora al revisar la guia: si el indice es uno de los
 * diferenciadores, sus pesos no pueden quedar escondidos en el codigo. Aqui
 * cualquiera los ve, y el administrador los cambia.
 *
 * ---------------------------------------------------------------------------
 * UN JUEGO DE PESOS PARA TODO EL SISTEMA
 *
 * No hay pesos por proyecto, y es una decision: el inicio ordena los proyectos
 * de peor a mejor, y eso solo es justo si todos se miden con la misma regla.
 *
 * Cambiar los pesos mueve el indice de TODOS los proyectos a la vez, porque se
 * calcula en el momento. Por eso el cambio exige un motivo y la historia queda
 * a la vista debajo: un indice que sube de 75 a 84 tiene que poder explicarse
 * como mejora real o como cambio de regla, y sin esa tabla no se podria.
 *
 * ---------------------------------------------------------------------------
 * LA SUMA SE MUESTRA MIENTRAS SE ESCRIBE
 *
 * El backend rechaza una suma distinta de 100, y esa es la regla que vale.
 * La pantalla muestra la suma en vivo y no deja guardar hasta que cuadre, para
 * que el error no se descubra al final: con tres numeros que se mueven, quien
 * escribe necesita ver cuanto le falta o le sobra.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';

import Campo from '../components/Campo.jsx';
import { cambiarPesos, obtenerPesos } from '../api/metricas.js';
import { useSesion } from '../context/SesionContext.jsx';
import { formatearFechaHora } from '../dominio/incidencias.js';
import { COMPONENTES_SALUD } from '../dominio/salud.js';
import { usePeticion } from '../hooks/usePeticion.js';

/** Los pesos de una fila como valores de formulario (texto, como los da un input). */
function aFormulario(pesos) {
  return {
    antiguedad: String(pesos.antiguedad),
    reapertura: String(pesos.reapertura),
    densidad: String(pesos.densidad),
    motivo: '',
  };
}

/** Suma lo escrito. Un campo vacio o no numerico cuenta como 0. */
function sumar(valores) {
  return COMPONENTES_SALUD.reduce((suma, { clave }) => suma + (Number(valores[clave]) || 0), 0);
}

export default function PesosSalud() {
  const { esAdministrador } = useSesion();

  const [version, setVersion] = useState(0);
  const [valores, setValores] = useState(null); // null = formulario cerrado
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [guardado, setGuardado] = useState(false);

  const peticion = usePeticion(() => obtenerPesos(), `pesos-salud-${version}`);

  function abrir() {
    setError(null);
    setGuardado(false);
    setValores(aFormulario(peticion.datos.vigentes));
  }

  function cerrar() {
    setValores(null);
    setError(null);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await cambiarPesos({
        antiguedad: Number(valores.antiguedad),
        reapertura: Number(valores.reapertura),
        densidad: Number(valores.densidad),
        motivo: valores.motivo,
      });
      setValores(null);
      setGuardado(true);
      setVersion((n) => n + 1);
    } catch (fallo) {
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  }

  if (peticion.error) {
    return (
      <main className="contenedor contenido">
        <h1 className="titulo">Pesos del &iacute;ndice</h1>
        <p className="alerta alerta--error">
          {peticion.error.message}{' '}
          <button className="enlace-boton" type="button" onClick={peticion.reintentar}>
            Reintentar
          </button>
        </p>
      </main>
    );
  }

  if (!peticion.datos) {
    return (
      <main className="contenedor contenido">
        <h1 className="titulo">Pesos del &iacute;ndice</h1>
        <p className="estado estado--cargando">Cargando...</p>
      </main>
    );
  }

  const { vigentes, historial } = peticion.datos;
  const suma = valores ? sumar(valores) : 100;

  return (
    <main className="contenedor contenido">
      <p className="guia__volver">
        <Link to="/salud">&larr; Volver al &iacute;ndice de salud</Link>
      </p>

      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Pesos del &iacute;ndice</h1>
          <p className="subtitulo">
            Cu&aacute;nto cuenta cada medici&oacute;n. Valen para todos los proyectos.
          </p>
        </div>

        {esAdministrador && valores === null && (
          <button className="boton boton--primario boton--auto" type="button" onClick={abrir}>
            Cambiar pesos
          </button>
        )}
      </header>

      {guardado && (
        <p className="alerta alerta--ok" role="status">
          Pesos guardados. El &iacute;ndice de todos los proyectos ya se calcula con ellos.
        </p>
      )}

      {valores !== null && (
        <form className="tarjeta" onSubmit={guardar}>
          <h2>Cambiar pesos</h2>
          <p className="subtitulo">
            Enteros de 0 a 100 que sumen 100. Afecta el &iacute;ndice de todos los proyectos.
          </p>

          <div className="campos-en-fila">
            {COMPONENTES_SALUD.map(({ clave, nombre }) => (
              <Campo key={clave} etiqueta={`${nombre} (%)`} error={error?.mensajeDe(clave)}>
                <input
                  className="campo__control"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={valores[clave]}
                  onChange={(e) => setValores({ ...valores, [clave]: e.target.value })}
                  required
                />
              </Campo>
            ))}
          </div>

          <p className={`pesos__suma${suma === 100 ? ' pesos__suma--ok' : ' pesos__suma--mal'}`}>
            Suman {suma} de 100
            {suma < 100 && ` \u00b7 faltan ${100 - suma}`}
            {suma > 100 && ` \u00b7 sobran ${suma - 100}`}
          </p>
          {error?.mensajeDe('pesos') && <p className="campo__error">{error.mensajeDe('pesos')}</p>}

          <Campo
            etiqueta="Motivo del cambio"
            ayuda="Queda en la historia, junto a tu nombre"
            error={error?.mensajeDe('motivo')}
          >
            <textarea
              className="campo__control campo__control--area"
              value={valores.motivo}
              onChange={(e) => setValores({ ...valores, motivo: e.target.value })}
              rows={3}
              minLength={5}
              maxLength={500}
              placeholder="Por ejemplo: el equipo acord&oacute; priorizar las reaperturas este semestre."
              required
            />
          </Campo>

          {error && !error.detalles?.length && <p className="alerta alerta--error">{error.message}</p>}

          <div className="acciones__confirmar">
            <button
              className="boton boton--primario boton--auto"
              type="submit"
              disabled={enviando || suma !== 100}
            >
              {enviando ? 'Guardando...' : 'Guardar pesos'}
            </button>
            <button
              className="boton boton--discreto boton--auto"
              type="button"
              onClick={cerrar}
              disabled={enviando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="tarjeta">
        <h2>Pesos vigentes</h2>
        <ul className="pesos__vigentes">
          {COMPONENTES_SALUD.map(({ clave, nombre }) => (
            <li key={clave}>
              <span>{nombre}</span>
              <strong className="pesos__valor">{vigentes[clave]}%</strong>
            </li>
          ))}
        </ul>

        <p className="pesos__origen">
          {vigentes.modificado_por ? (
            <>
              Fijados el {formatearFechaHora(vigentes.fecha_cambio)} por{' '}
              <strong>{vigentes.modificado_por.nombre}</strong>.
            </>
          ) : (
            <>Son los pesos iniciales del sistema: nadie los ha cambiado.</>
          )}
        </p>

        {!esAdministrador && (
          <p className="pesos__origen">Solo el administrador puede cambiarlos.</p>
        )}
      </section>

      <section className="tarjeta">
        <h2>Historial de cambios</h2>

        {historial.length === 0 ? (
          <p className="vacio">Todav&iacute;a no hay cambios: rigen los pesos iniciales.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Qui&eacute;n</th>
                  <th scope="col" className="tabla__num">Antig&uuml;edad</th>
                  <th scope="col" className="tabla__num">Reapertura</th>
                  <th scope="col" className="tabla__num">Reparto</th>
                  <th scope="col">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((cambio) => (
                  <tr key={cambio.id_peso}>
                    <td>{formatearFechaHora(cambio.fecha_cambio)}</td>
                    <td>{cambio.modificado_por_nombre}</td>
                    <td className="tabla__num">{cambio.antiguedad}%</td>
                    <td className="tabla__num">{cambio.reapertura}%</td>
                    <td className="tabla__num">{cambio.densidad}%</td>
                    <td>{cambio.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
