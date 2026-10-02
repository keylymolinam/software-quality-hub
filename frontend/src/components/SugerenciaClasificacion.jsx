/**
 * Lo que el motor de clasificacion deduce del texto escrito.
 *
 * Muestra la categoria y la prioridad sugeridas junto con LA EVIDENCIA que las
 * produjo: los terminos encontrados, los puntajes de cada categoria y las
 * senales que movieron la prioridad.
 *
 * Ensenar la evidencia no es un adorno. Un clasificador que solo dice
 * "SEGURIDAD" obliga a creerle; uno que dice "SEGURIDAD porque encontre
 * 'vulnerabilidad' y 'acceso sin permiso'" se puede contradecir. Esa diferencia
 * es lo que permite que la persona corrija al motor cuando se equivoca, y es el
 * aporte que el proyecto defiende.
 *
 * El panel insiste en que es una sugerencia y no una decision tomada, porque la
 * regla del sistema es que una eleccion humana nunca se sobreescribe.
 */
import { CATEGORIAS, PRIORIDADES, etiquetaDe } from '../dominio/incidencias.js';

export default function SugerenciaClasificacion({ sugerencia, consultando, suficiente, activa }) {
  // Si la persona ya eligio las dos cosas, el motor no se va a ejecutar al
  // guardar. Decirlo es mas honesto que esconder el panel: explica por que dejo
  // de aparecer una sugerencia que hace un momento estaba.
  if (!activa) {
    return (
      <aside className="sugerencia sugerencia--inactiva">
        <span className="sugerencia__rotulo">Clasificaci&oacute;n</span>
        <p className="sugerencia__texto">
          Elegiste la categor&iacute;a y la prioridad, as&iacute; que se guardan tal como las
          indicaste. El motor no interviene.
        </p>
      </aside>
    );
  }

  if (!suficiente) {
    return (
      <aside className="sugerencia sugerencia--inactiva">
        <span className="sugerencia__rotulo">Clasificaci&oacute;n autom&aacute;tica</span>
        <p className="sugerencia__texto">
          Escribe el t&iacute;tulo y la descripci&oacute;n: el motor va a sugerir la categor&iacute;a
          y la prioridad, y a mostrarte en qu&eacute; se basa.
        </p>
      </aside>
    );
  }

  if (!sugerencia) {
    return (
      <aside className="sugerencia sugerencia--inactiva">
        <span className="sugerencia__rotulo">Clasificaci&oacute;n autom&aacute;tica</span>
        <p className="sugerencia__texto">
          <span className="estado estado--cargando">Analizando el texto...</span>
        </p>
      </aside>
    );
  }

  const { categoria, prioridad, confianza, evidencia } = sugerencia;

  // Solo las categorias que puntuaron. Las que quedaron en cero no aportan nada
  // a la explicacion y llenarian el panel de ruido.
  const puntuaron = Object.entries(evidencia.puntajes)
    .filter(([, puntaje]) => puntaje > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <aside className={`sugerencia${consultando ? ' sugerencia--actualizando' : ''}`}>
      <span className="sugerencia__rotulo">Sugerencia del motor</span>

      <div className="sugerencia__veredicto">
        <strong className="sugerencia__categoria">{etiquetaDe(CATEGORIAS, categoria)}</strong>
        <span className={`prioridad prioridad--${prioridad.toLowerCase()}`}>
          Prioridad {etiquetaDe(PRIORIDADES, prioridad).toLowerCase()}
        </span>
      </div>

      {/* La confianza mide cuan disputada estuvo la decision, no la
          probabilidad de acertar. Se nombra asi para no prometer mas de lo que
          significa. */}
      <p className="sugerencia__confianza">
        Evidencia concentrada en esta categor&iacute;a: <strong>{Math.round(confianza * 100)}%</strong>
      </p>

      <dl className="sugerencia__detalle">
        {evidencia.terminos_categoria.length > 0 && (
          <>
            <dt>T&eacute;rminos encontrados</dt>
            <dd>
              {evidencia.terminos_categoria.map((termino) => (
                <code key={termino} className="termino">{termino}</code>
              ))}
            </dd>
          </>
        )}

        {puntuaron.length > 0 && (
          <>
            <dt>Puntajes</dt>
            <dd className="sugerencia__puntajes">
              {puntuaron.map(([nombre, puntaje]) => (
                <span key={nombre} className={nombre === categoria ? 'puntaje puntaje--gana' : 'puntaje'}>
                  {etiquetaDe(CATEGORIAS, nombre)} <strong>{puntaje}</strong>
                </span>
              ))}
            </dd>
          </>
        )}

        {evidencia.senales_alta.length > 0 && (
          <>
            <dt>Sube la prioridad</dt>
            <dd>
              {evidencia.senales_alta.map((senal) => (
                <code key={senal} className="termino">{senal}</code>
              ))}
            </dd>
          </>
        )}

        {evidencia.senales_baja.length > 0 && (
          <>
            <dt>Baja la prioridad</dt>
            <dd>
              {evidencia.senales_baja.map((senal) => (
                <code key={senal} className="termino">{senal}</code>
              ))}
            </dd>
          </>
        )}

        {/* El motor distingue una falla de una peticion de mejora. Cuando cree
            que es una peticion conviene decirlo: cambia como se prioriza. */}
        {evidencia.es_peticion && (
          <>
            <dt>Observaci&oacute;n</dt>
            <dd>El texto parece una petici&oacute;n de mejora, no una falla.</dd>
          </>
        )}
      </dl>

      <p className="sugerencia__aviso">
        Es una sugerencia. Si eliges categor&iacute;a o prioridad m&aacute;s abajo, se respeta
        tu elecci&oacute;n y la incidencia no queda marcada como clasificada
        autom&aacute;ticamente.
      </p>
    </aside>
  );
}
