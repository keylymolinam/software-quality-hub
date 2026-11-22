/**
 * Etiqueta que se despliega para editarse: lo que se ve (children) mas un
 * <select> invisible encima que la cubre entera.
 *
 * Nacio dentro de la tabla de la lista y salio a su propio archivo cuando el
 * detalle tambien permitio asignar y cambiar la prioridad: las dos pantallas
 * tienen que editar igual, y dos copias terminan diferenciandose.
 *
 * El select nativo es lo que recibe el clic, el foco y el teclado. Se eligio
 * asi y no un menu propio porque el nativo ya resuelve el teclado, el lector
 * de pantalla y el celular, y la etiqueta de colores sigue siendo lo que se ve.
 * La flecha y el resaltado los pone .editable en index.css.
 */
export default function Editable({ etiqueta, valor, opciones, onElegir, deshabilitado, children }) {
  return (
    <span className={`editable${deshabilitado ? ' editable--ocupada' : ''}`}>
      {children}
      <select
        className="editable__control"
        aria-label={etiqueta}
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => {
          if (e.target.value !== valor) onElegir(e.target.value);
        }}
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </span>
  );
}
