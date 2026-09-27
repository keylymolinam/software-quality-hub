/**
 * Registro de una incidencia.
 *
 * Es la pantalla donde los dos diferenciadores del proyecto se vuelven
 * visibles, y esta construida alrededor de eso:
 *
 *   - Mientras se escribe, el motor de clasificacion sugiere categoria y
 *     prioridad y muestra en que se basa. La sugerencia no se aplica sola: solo
 *     rellena lo que se dejo en blanco al guardar.
 *   - Al registrar, si el texto se parece a una incidencia existente, se avisa
 *     con el numero que lo sostiene. El aviso no impide el registro.
 *
 * ---------------------------------------------------------------------------
 * SOBRE DEJAR CAMPOS EN BLANCO
 *
 * Categoria y prioridad son opcionales, y su opcion vacia no dice "sin valor"
 * sino "deducelo tu". Esa es la parte que conviene que se entienda en pantalla,
 * porque de ella depende la marca `clasificacion_automatica`: el backend la pone
 * en 1 solo cuando AMBOS campos quedaron en blanco. Si la persona elige uno, la
 * clasificacion es mixta y no corresponde atribuirsela al motor.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AvisoDuplicado from '../components/AvisoDuplicado.jsx';
import SugerenciaClasificacion from '../components/SugerenciaClasificacion.jsx';
import { crearIncidencia } from '../api/incidencias.js';
import { listarProyectos } from '../api/proyectos.js';
import { listarUsuarios } from '../api/usuarios.js';
import { CATEGORIAS, PRIORIDADES, etiquetaDe } from '../dominio/incidencias.js';
import { useClasificacionSugerida } from '../hooks/useClasificacionSugerida.js';
import { usePeticion } from '../hooks/usePeticion.js';

// Los mismos limites que valida el backend. Se repiten aqui solo para poder
// avisarlos antes de enviar; la validacion que manda sigue siendo la del
// servidor, y sus mensajes son los que se muestran si algo no calza.
const LARGO_TITULO = { min: 5, max: 150 };
const LARGO_DESCRIPCION = { min: 10, max: 5000 };

export default function NuevaIncidencia() {
  const navegar = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idProyecto, setIdProyecto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [asignadoA, setAsignadoA] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [creada, setCreada] = useState(null);

  // El motor solo interviene si quedo algo en blanco. Cuando la persona eligio
  // las dos cosas, pedir una sugerencia seria enganoso: no se va a usar.
  const motorIntervendra = categoria === '' || prioridad === '';

  const sugerida = useClasificacionSugerida(titulo, descripcion, motorIntervendra);

  const referencias = usePeticion(
    () => Promise.all([listarProyectos({ limite: 100 }), listarUsuarios({ limite: 100 })]),
    'referencias-nueva-incidencia'
  );

  const [proyectos, usuarios] = useMemo(
    () => referencias.datos ?? [null, null],
    [referencias.datos]
  );

  async function alEnviar(evento) {
    evento.preventDefault();

    setError(null);
    setEnviando(true);

    try {
      const incidencia = await crearIncidencia({
        titulo,
        descripcion,
        id_proyecto: idProyecto,
        categoria,
        prioridad,
        asignado_a: asignadoA,
      });

      setCreada(incidencia);
    } catch (fallo) {
      setError(fallo);
    } finally {
      // En finally para que el boton se reactive tanto si funciono como si
      // fallo. Solo en el catch, un error inesperado dejaria el formulario
      // bloqueado para siempre.
      setEnviando(false);
    }
  }

  /** Vuelve al formulario vacio para registrar otra. */
  function registrarOtra() {
    setTitulo('');
    setDescripcion('');
    setCategoria('');
    setPrioridad('');
    setAsignadoA('');
    setError(null);
    setCreada(null);
    // El proyecto se conserva: quien registra varias incidencias suele estar
    // trabajando sobre el mismo.
  }

  // --- Confirmacion -------------------------------------------------------
  // Al registrar no se navega de inmediato al listado. Hay dos cosas que solo
  // se pueden contar aqui: que decidio el motor, y si la incidencia podria
  // estar repetida. Si la pantalla cambiara sola, ese aviso se perderia.
  if (creada) {
    return (
      <main className="contenedor contenido">
        <div className="confirmacion">
          <span className="confirmacion__rotulo">Registrada</span>
          <h1 className="titulo">Incidencia #{creada.id_incidencia}</h1>
          <p className="subtitulo">{creada.titulo}</p>

          <dl className="detalle">
            <dt>Proyecto</dt>
            <dd>{creada.proyecto_nombre}</dd>
            <dt>Categoria</dt>
            <dd>{etiquetaDe(CATEGORIAS, creada.categoria)}</dd>
            <dt>Prioridad</dt>
            <dd>{etiquetaDe(PRIORIDADES, creada.prioridad)}</dd>
            <dt>Estado</dt>
            <dd>Abierta</dd>
            <dt>Clasificacion</dt>
            <dd>
              {creada.clasificacion_automatica === 1
                ? 'Deducida por el motor'
                : 'Indicada por ti'}
            </dd>
          </dl>

          {creada.advertencia_duplicado && (
            <AvisoDuplicado advertencia={creada.advertencia_duplicado} />
          )}

          <div className="confirmacion__acciones">
            <button
              className="boton boton--primario boton--auto"
              type="button"
              onClick={() => navegar('/incidencias')}
            >
              Ver en el listado
            </button>
            <button className="boton boton--discreto" type="button" onClick={registrarOtra}>
              Registrar otra
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- Formulario ---------------------------------------------------------

  const sinConexion = error?.status === 0;

  return (
    <main className="contenedor contenedor--ancho contenido">
      <header className="contenido__cabecera">
        <div>
          <h1 className="titulo">Nueva incidencia</h1>
          <p className="subtitulo">
            Describe el problema. La categoria y la prioridad se deducen del
            texto si no las indicas.
          </p>
        </div>
        <Link className="boton boton--discreto" to="/incidencias">
          Cancelar
        </Link>
      </header>

      {error && (
        <p className={`alerta ${sinConexion ? 'alerta--aviso' : 'alerta--error'}`}>
          {error.message}
        </p>
      )}

      <div className="formulario-con-panel">
        <form className="tarjeta" onSubmit={alEnviar}>
          <Campo
            etiqueta="Titulo"
            ayuda={`Entre ${LARGO_TITULO.min} y ${LARGO_TITULO.max} caracteres`}
            error={error?.mensajeDe('titulo')}
          >
            <input
              className="campo__control"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={LARGO_TITULO.max}
              placeholder="El portal no carga para ningun usuario"
              autoFocus
              required
            />
          </Campo>

          <Campo
            etiqueta="Descripcion"
            ayuda={`Desde ${LARGO_DESCRIPCION.min} caracteres. Cuenta que ocurre, cuando y a quien afecta.`}
            error={error?.mensajeDe('descripcion')}
          >
            <textarea
              className="campo__control campo__control--area"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={LARGO_DESCRIPCION.max}
              rows={6}
              placeholder="Al ingresar a la direccion del portal el navegador muestra un error 500. Afecta a todos los clientes desde esta manana."
              required
            />
          </Campo>

          <Campo etiqueta="Proyecto" error={error?.mensajeDe('id_proyecto')}>
            <select
              className="campo__control"
              value={idProyecto}
              onChange={(e) => setIdProyecto(e.target.value)}
              required
            >
              <option value="">Elige un proyecto</option>
              {(proyectos?.datos ?? []).map((p) => (
                <option key={p.id_proyecto} value={p.id_proyecto}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <div className="campos-en-fila">
            <Campo
              etiqueta="Categoria"
              ayuda="En blanco, la deduce el motor"
              error={error?.mensajeDe('categoria')}
            >
              <select
                className="campo__control"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="">Deducir automaticamente</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              etiqueta="Prioridad"
              ayuda="En blanco, la deduce el motor"
              error={error?.mensajeDe('prioridad')}
            >
              <select
                className="campo__control"
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
              >
                <option value="">Deducir automaticamente</option>
                {PRIORIDADES.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo
            etiqueta="Asignar a"
            ayuda="Opcional. Una incidencia recien reportada puede no tener responsable."
            error={error?.mensajeDe('asignado_a')}
          >
            <select
              className="campo__control"
              value={asignadoA}
              onChange={(e) => setAsignadoA(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {(usuarios?.datos ?? []).map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre} ({u.rol.toLowerCase()})
                </option>
              ))}
            </select>
          </Campo>

          <button className="boton boton--primario" type="submit" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Registrar incidencia'}
          </button>

          <p className="ayuda ayuda--neutra">
            Quedara <strong>abierta</strong> y a tu nombre. Quien reporta se toma
            de la sesion, no del formulario.
          </p>
        </form>

        <SugerenciaClasificacion
          sugerencia={sugerida.sugerencia}
          consultando={sugerida.consultando}
          suficiente={sugerida.suficiente}
          activa={motorIntervendra}
        />
      </div>
    </main>
  );
}

/**
 * Un campo del formulario: etiqueta, control, ayuda y error.
 *
 * Vive aqui porque solo lo usa esta pantalla. Reune las cuatro partes para que
 * el error aparezca siempre en el mismo sitio y con el mismo aspecto, y para no
 * repetir la estructura en seis campos.
 */
function Campo({ etiqueta, ayuda, error, children }) {
  return (
    <label className={`campo${error ? ' campo--con-error' : ''}`}>
      <span className="campo__etiqueta">{etiqueta}</span>
      {children}
      {/* El error del servidor manda sobre la ayuda: si hay algo que corregir,
          es mas urgente que la indicacion general. */}
      {error ? (
        <span className="campo__error">{error}</span>
      ) : (
        ayuda && <span className="campo__ayuda">{ayuda}</span>
      )}
    </label>
  );
}
