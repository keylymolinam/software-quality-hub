/**
 * Un componente del indice de salud, con su barra y su evidencia.
 *
 * Los tres componentes se dibujan iguales y en una sola columna para que sus
 * puntajes se comparen de un vistazo: lo primero que se pregunta ante un indice
 * bajo es cual de las tres partes lo esta bajando.
 *
 * ---------------------------------------------------------------------------
 * POR QUE LA BARRA MIDE EL PUNTAJE Y EL PESO VA EN TEXTO
 *
 * Cada componente tiene dos numeros: su puntaje (0 a 100) y su peso en el
 * indice (0.40, 0.35, 0.25). Son magnitudes distintas, y codificar las dos en
 * la misma figura inventaria una relacion que no existe. La barra mide solo el
 * puntaje, que es lo comparable entre los tres; el peso y el aporte van escritos
 * al lado.
 *
 * El aporte (puntaje x peso) es el dato que de verdad explica el indice: un 60
 * en el componente que pesa 0.40 arrastra mas que un 40 en el que pesa 0.25.
 *
 * ---------------------------------------------------------------------------
 * POR QUE TODAS LAS BARRAS SON DEL MISMO COLOR
 *
 * Los tres miden lo mismo, asi que el color no tiene nada que distinguir: cada
 * componente se identifica por su nombre. Pintar cada barra de un tono distinto,
 * o mas oscura segun el valor, repetiria en el color lo que el largo ya dice y
 * gastaria el unico canal libre que queda.
 *
 * La cifra va FUERA del extremo de la barra, no dentro: un puntaje bajo deja una
 * barra de pocos pixeles, y un numero dentro quedaria recortado.
 */
export default function ComponenteSalud({ nombre, puntaje, peso, children }) {
  const aporte = puntaje * peso;
  const maximo = 100 * peso;

  return (
    <li className="componente">
      <div className="componente__cabecera">
        <h3 className="componente__nombre">{nombre}</h3>
        <span className="componente__puntaje">
          {puntaje.toFixed(1)}
          <span className="componente__de">/100</span>
        </span>
      </div>

      {/* role y los valores aria hacen que el lector de pantalla anuncie el
          puntaje: la barra es decorativa, el dato esta en el texto y aqui. */}
      <div
        className="barra"
        role="img"
        aria-label={`${nombre}: ${puntaje.toFixed(1)} de 100`}
        title={`Aporta ${aporte.toFixed(1)} de los ${maximo.toFixed(0)} puntos que este componente puede sumar al indice.`}
      >
        <div className="barra__relleno" style={{ width: `${Math.max(0, Math.min(100, puntaje))}%` }} />
      </div>

      <p className="componente__aporte">
        Pesa {Math.round(peso * 100)}% &middot; aporta <strong>{aporte.toFixed(1)}</strong> de{' '}
        {maximo.toFixed(0)} puntos
      </p>

      <p className="componente__evidencia">{children}</p>
    </li>
  );
}
