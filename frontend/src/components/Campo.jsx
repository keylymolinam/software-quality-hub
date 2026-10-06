/**
 * Un campo de formulario: etiqueta, control, ayuda y error.
 *
 * Reune las cuatro partes para que el error aparezca siempre en el mismo sitio
 * y con el mismo aspecto, y para no repetir la estructura en cada campo.
 *
 * Vivio duplicado dentro de NuevaIncidencia.jsx y EditarIncidencia.jsx mientras
 * fueron dos; se extrajo al aparecer el tercero, que es la condicion que el
 * comentario de aquellos archivos anunciaba. Dos copias se mantienen al dia a
 * mano sin esfuerzo; tres ya no.
 *
 * El error del servidor manda sobre la ayuda: si hay algo que corregir, es mas
 * urgente que la indicacion general. Nunca se muestran los dos a la vez, porque
 * entonces habria que leer cual de los dos importa.
 */
export default function Campo({ etiqueta, ayuda, error, children }) {
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
