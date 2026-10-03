/**
 * Edicion de una incidencia ya registrada.
 *
 * Corrige lo que se escribio mal o cambia lo que dejo de ser cierto: un titulo
 * poco claro, una prioridad que subio, un responsable nuevo. Hasta ahora una
 * incidencia solo se podia registrar y mover de estado, y un error de tipeo se
 * quedaba a la vista para siempre.
 *
 * ---------------------------------------------------------------------------
 * LO QUE ESTA PANTALLA NO PUEDE TOCAR
 *
 * El estado no se edita aqui: se cambia con una transicion, que valida el flujo
 * y deja constancia en la bitacora. Tampoco la fecha de resolucion ni la marca
 * de clasificacion automatica, que las pone el sistema, ni quien reporto, que
 * es un dato historico. El backend rechaza los cuatro con un 400 que explica el
 * motivo; esta pantalla simplemente no los ofrece.
 *
 * Que un campo no aparezca en el formulario no es casualidad ni olvido: es la
 * misma lista CAMPOS_EDITABLES del service, vista desde el otro lado.
 *
 * ---------------------------------------------------------------------------
 * SE ENVIA SOLO LO QUE CAMBIO
 *
 * El formulario compara contra los valores con que se cargo y manda unicamente
 * los campos distintos. Dos razones: la peticion describe la intencion real
 * (modificar el responsable, no "reescribir la incidencia entera"), y si no
 * cambio nada el boton ni siquiera se habilita, en vez de mandar un PUT que el
 * backend rechazaria por vacio.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { actualizarIncidencia, obtenerIncidencia } from '../api/incidencias.js';
import { listarProyectos } from '../api/proyectos.js';
import { listarUsuarios } from '../api/usuarios.js';
import { CATEGORIAS, PRIORIDADES } from '../dominio/incidencias.js';
import { usePeticion } from '../hooks/usePeticion.js';

const LARGO_TITULO = { min: 5, max: 150 };
const LARGO_DESCRIPCION = { min: 10, max: 5000 };

/**
 * Pasa una incidencia del backend a los valores del formulario.
 *
 * Todo se maneja como texto, que es lo que devuelven los controles del
 * navegador: asi la comparacion entre lo cargado y lo escrito es directa, sin
 * tener que distinguir el 3 del "3".
 */
function aFormulario(incidencia) {
  return {
    titulo: incidencia.titulo,
    descripcion: incidencia.descripcion,
    id_proyecto: String(incidencia.id_proyecto),
    categoria: incidencia.categoria,
    prioridad: incidencia.prioridad,
    asignado_a: incidencia.asignado_a === null ? '' : String(incidencia.asignado_a),
  };
}

export default function EditarIncidencia() {
  const { id } = useParams();
  const navegar = useNavigate();

  const incidencia = usePeticion(() => obtenerIncidencia(id), `editar-${id}`);

  const referencias = usePeticion(
    () => Promise.all([listarProyectos({ limite: 100 }), listarUsuarios({ limite: 100 })]),
    'referencias-edicion'
  );

  // null hasta que llegan los datos; a partir de ahi, lo que hay en pantalla.
  const [valores, setValores] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  // Los valores con los que se cargo el formulario, para saber que cambio.
  const originales = useMemo(
    () => (incidencia.datos ? aFormulario(incidencia.datos) : null),
    [incidencia.datos]
  );

  // El estado del formulario se inicializa en el primer render que trae datos.
  // Se hace aqui y no en un efecto para que no exista un render intermedio con
  // los campos vacios, que se veria como un parpadeo.
  const actuales = valores ?? originales;

  const cambios = useMemo(() => {
    if (!originales || !actuales) return {};

    const distintos = {};

    for (const campo of Object.keys(originales)) {
      if (actuales[campo] === originales[campo]) continue;

      // El vacio del desplegable de responsable significa "sin asignar", y eso
      // se envia como null: omitirlo le diria al backend que no lo toque.
      distintos[campo] =
        campo === 'asignado_a' && actuales[campo] === '' ? null : actuales[campo];
    }

    return distintos;
  }, [originales, actuales]);

  const hayCambios = Object.keys(cambios).length > 0;

  function cambiar(campo, valor) {
    setValores((anteriores) => ({ ...(anteriores ?? originales), [campo]: valor }));
  }

  async function alEnviar(evento) {
    evento.preventDefault();

    setError(null);
    setEnviando(true);

    try {
      await actualizarIncidencia(id, cambios);

      // Se vuelve al detalle, que es de donde se vino y donde se comprueba que
      // el cambio quedo. Se reemplaza la entrada del historial para que el
      // boton atras no traiga de vuelta el formulario ya enviado.
      navegar(`/incidencias/${id}`, { replace: true });
    } catch (fallo) {
      setError(fallo);
      setEnviando(false);
    }
  }

  if (incidencia.error) {
    return (
      <main className="contenedor contenido">
        <h1 className="titulo">Incidencia #{id}</h1>
        <p className="alerta alerta--error">{incidencia.error.message}</p>
        <Link className="boton boton--discreto boton--auto" to="/incidencias">
          Volver al listado
        </Link>
      </main>
    );
  }

  if (!actuales) {
    return (
      <main className="contenedor contenido">
        <p className="estado estado--cargando">Cargando la incidencia...</p>
      </main>
    );
  }

  const [proyectos, usuarios] = referencias.datos ?? [null, null];

  return (
    <main className="contenedor contenido">
      <header className="contenido__cabecera">
        <div>
          <p className="migas">
            <Link to={`/incidencias/${id}`}>Incidencia #{id}</Link> &middot; editar
          </p>
          <h1 className="titulo">Editar incidencia</h1>
        </div>

        <Link className="boton boton--discreto boton--auto" to={`/incidencias/${id}`}>
          Cancelar
        </Link>
      </header>

      {error && <p className="alerta alerta--error">{error.message}</p>}

      <form className="tarjeta" onSubmit={alEnviar}>
        <Campo
          etiqueta="T&iacute;tulo"
          ayuda={`Entre ${LARGO_TITULO.min} y ${LARGO_TITULO.max} caracteres`}
          error={error?.mensajeDe('titulo')}
        >
          <input
            className="campo__control"
            type="text"
            value={actuales.titulo}
            onChange={(e) => cambiar('titulo', e.target.value)}
            maxLength={LARGO_TITULO.max}
            required
          />
        </Campo>

        <Campo
          etiqueta="Descripci&oacute;n"
          ayuda={`Desde ${LARGO_DESCRIPCION.min} caracteres`}
          error={error?.mensajeDe('descripcion')}
        >
          <textarea
            className="campo__control campo__control--area"
            value={actuales.descripcion}
            onChange={(e) => cambiar('descripcion', e.target.value)}
            maxLength={LARGO_DESCRIPCION.max}
            rows={6}
            required
          />
        </Campo>

        <Campo etiqueta="Proyecto" error={error?.mensajeDe('id_proyecto')}>
          <select
            className="campo__control"
            value={actuales.id_proyecto}
            onChange={(e) => cambiar('id_proyecto', e.target.value)}
            required
          >
            {/* Mientras la lista no llega se dibuja solo el valor actual, para
                que el desplegable nunca aparezca en blanco mostrando algo
                distinto de lo que la incidencia tiene guardado. */}
            {proyectos?.datos ? (
              proyectos.datos.map((p) => (
                <option key={p.id_proyecto} value={p.id_proyecto}>
                  {p.nombre}
                </option>
              ))
            ) : (
              <option value={actuales.id_proyecto}>
                {incidencia.datos.proyecto_nombre}
              </option>
            )}
          </select>
        </Campo>

        <div className="campos-en-fila">
          <Campo etiqueta="Categor&iacute;a" error={error?.mensajeDe('categoria')}>
            <select
              className="campo__control"
              value={actuales.categoria}
              onChange={(e) => cambiar('categoria', e.target.value)}
            >
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Prioridad" error={error?.mensajeDe('prioridad')}>
            <select
              className="campo__control"
              value={actuales.prioridad}
              onChange={(e) => cambiar('prioridad', e.target.value)}
            >
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
          ayuda="Dejarlo sin asignar tambi&eacute;n es una opci&oacute;n v&aacute;lida."
          error={error?.mensajeDe('asignado_a')}
        >
          <select
            className="campo__control"
            value={actuales.asignado_a}
            onChange={(e) => cambiar('asignado_a', e.target.value)}
          >
            <option value="">Sin asignar</option>
            {(usuarios?.datos ?? []).map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nombre} ({u.rol.toLowerCase()})
              </option>
            ))}
          </select>
        </Campo>

        {/* Deshabilitado mientras no haya nada que guardar: un PUT sin cambios
            lo rechaza el backend, y es mas claro decirlo antes de enviarlo. */}
        <button
          className="boton boton--primario"
          type="submit"
          disabled={enviando || !hayCambios}
        >
          {enviando ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <p className="ayuda ayuda--neutra">
          El <strong>estado</strong> no se edita aqu&iacute;: se cambia con una
          transici&oacute;n, para que quede registrada en la bit&aacute;cora con su autor y
          su motivo.
        </p>
      </form>
    </main>
  );
}

/**
 * Un campo del formulario: etiqueta, control, ayuda y error.
 *
 * Repite el componente del mismo nombre de NuevaIncidencia.jsx. Se deja
 * duplicado y no se extrae a components/ porque son diez lineas y las dos
 * pantallas pueden evolucionar por separado; si aparece una tercera, conviene
 * sacarlo.
 */
function Campo({ etiqueta, ayuda, error, children }) {
  return (
    <label className={`campo${error ? ' campo--con-error' : ''}`}>
      <span className="campo__etiqueta">{etiqueta}</span>
      {children}
      {error ? (
        <span className="campo__error">{error}</span>
      ) : (
        ayuda && <span className="campo__ayuda">{ayuda}</span>
      )}
    </label>
  );
}
