/**
 * Configuracion central de la aplicacion.
 *
 * Lee el archivo .env una sola vez y expone los valores ya validados.
 * El resto del codigo importa desde aqui y nunca lee process.env directamente:
 * asi hay un unico lugar donde saber que configuracion existe.
 */
import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  dbPath: process.env.DB_PATH || './data/software_quality_hub.sqlite',

  // --- Autenticacion ---

  // Clave con la que se firman los tokens de sesion. Quien la conozca puede
  // fabricar tokens validos y entrar como cualquier usuario, por eso vive en
  // el archivo .env y ese archivo no se sube al repositorio.
  jwtSecret: process.env.JWT_SECRET || '',

  // Duracion de la sesion. Un token no se puede anular una vez emitido (el
  // servidor no guarda registro de los tokens vigentes), asi que su vigencia
  // es la unica forma de limitar el dano si alguien lo roba.
  jwtExpiracion: process.env.JWT_EXPIRACION || '8h',

  // Costo del hash de bcrypt: numero de rondas, en potencias de dos.
  // 10 son ~1024 iteraciones y tardan decimas de segundo. Esa lentitud es
  // deliberada: hace inviable probar millones de contrasenas por segundo si
  // la base de datos se filtrara. Subirlo aumenta la seguridad y el tiempo
  // de respuesta del login en la misma proporcion.
  bcryptRondas: Number(process.env.BCRYPT_RONDAS) || 10,

  // --- Diferenciadores ---

  // Similitud minima (coeficiente de Jaccard, de 0 a 1) para marcar una
  // incidencia como posible duplicado.
  //
  // El valor se fijo midiendo sobre los datos de prueba, no a ojo. Sobre los
  // 27 pares de incidencias del mismo proyecto que existen en el seed:
  //
  //   duplicado real (#1 y #2, la misma falla contada con otras palabras)  0.550
  //   par no relacionado mas parecido que le sigue                         0.071
  //
  // Entre ambos hay un factor de casi ocho, y nada en medio. Cualquier umbral
  // dentro de ese hueco separa igual de bien; 0.45 se elige por quedar holgado
  // de los dos lados.
  //
  // Un umbral mas alto (0.75, por ejemplo) solo detecta textos casi copiados:
  // dos personas que describen la misma falla con su propio vocabulario
  // comparten alrededor de la mitad de las palabras, no tres cuartos.
  //
  // Advertencia: un solo duplicado real es poca evidencia. Conviene recalibrar
  // con datos de uso verdadero, y por eso el valor es una variable de entorno
  // y existe analizarIncidencia() para recalcular sin tocar codigo.
  umbralDuplicado: Number(process.env.UMBRAL_DUPLICADO) || 0.45,
};

export const isDevelopment = config.nodeEnv === 'development';

// En desarrollo se permite trabajar sin definir JWT_SECRET, con una clave fija
// y un aviso visible. En produccion no: arrancar con una clave conocida seria
// dejar la puerta abierta, y es preferible que el servidor no parta a que
// parta inseguro sin que nadie se de cuenta.
if (!config.jwtSecret) {
  if (isDevelopment) {
    config.jwtSecret = 'clave-solo-para-desarrollo-no-usar-en-produccion';
    console.warn(
      '  AVISO: JWT_SECRET no esta definido en .env; se usa una clave de desarrollo.'
    );
  } else {
    throw new Error(
      'JWT_SECRET es obligatorio cuando NODE_ENV=production. Definelo en el archivo .env.'
    );
  }
}
