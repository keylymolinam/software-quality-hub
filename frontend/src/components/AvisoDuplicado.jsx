/**
 * Aviso de posible incidencia repetida.
 *
 * Se muestra DESPUES de registrar, y eso es deliberado: el detector avisa pero
 * no impide. El algoritmo compara palabras, no comprende el problema, y dos
 * incidencias parecidas pueden ser perfectamente distintas. Quien reporta es
 * quien decide, y para decidir necesita que la incidencia ya exista.
 *
 * Por eso el tono es de aviso y no de error: nada fallo. Se informa un parecido
 * y se entrega el numero que lo sostiene, para que la afirmacion se pueda
 * discutir en vez de tener que creerla.
 */
export default function AvisoDuplicado({ advertencia }) {
  const { id_incidencia: idOriginal, titulo, similitud, umbral, evaluadas } = advertencia;

  return (
    <div className="aviso-duplicado">
      <span className="aviso-duplicado__rotulo">Posible duplicado</span>

      <p className="aviso-duplicado__texto">
        Se parece a la incidencia <strong>#{idOriginal}</strong>, &laquo;{titulo}&raquo;.
      </p>

      {/* Los tres numeros que justifican el aviso. Se muestran juntos porque
          separados no dicen nada: un 0.76 solo tiene sentido al lado del umbral
          que tuvo que superar y de cuantas incidencias se compararon. */}
      <dl className="aviso-duplicado__cifras">
        <div>
          <dt>Similitud</dt>
          <dd>{Math.round(similitud * 100)}%</dd>
        </div>
        <div>
          <dt>Umbral</dt>
          <dd>{Math.round(umbral * 100)}%</dd>
        </div>
        <div>
          <dt>Comparada con</dt>
          <dd>{evaluadas}</dd>
        </div>
      </dl>

      <p className="aviso-duplicado__nota">
        Se registr&oacute; igual. Si confirmas que es la misma falla, puedes cerrar esta
        incidencia indicando el motivo, y la bit&aacute;cora guardar&aacute; por qu&eacute; se cerr&oacute;
        sin trabajarla.
      </p>
    </div>
  );
}
