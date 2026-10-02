# CLAUDE.md

Guía para trabajar en este repositorio. El `README.md` documenta el **qué** (endpoints,
setup, diferenciadores); este archivo documenta el **cómo**: las convenciones e
invariantes que no se ven leyendo un solo archivo.

## Contexto del proyecto

Sistema de gestión de incidencias de software, proyecto de título de Ingeniería en
Computación e Informática. No es un producto comercial: **el código es parte de la
memoria**, y por eso la justificación escrita de cada decisión tiene el mismo valor que
el código que la implementa.

Estado actual: la API REST está completa (tres entidades, máquina de estados,
autenticación por rol y los tres diferenciadores). El frontend ya permite recorrer el
ciclo de trabajo completo, con cinco pantallas:

| Pantalla | Ruta | Qué resuelve |
|---|---|---|
| Login | — (fuera de sesión) | Única pantalla sin sesión; `App.jsx` decide |
| Inicio | `/` | Comprueba la conexión y adelanta el índice de salud como número |
| Listado | `/incidencias` | Filtros, búsqueda, orden y paginación en la dirección |
| Registro | `/incidencias/nueva` | Clasificación sugerida en vivo y aviso de duplicados |
| Detalle | `/incidencias/:id` | Transiciones de estado y bitácora |

Pendiente: el panel del índice de salud con su desglose por componente (hoy la pantalla
de inicio muestra solo el número global) y la administración de proyectos y usuarios.

## Comandos

```bash
# Backend (desde backend/)
npm run dev        # desarrollo con --watch
npm start          # sin reinicio automático
npm run db:seed    # VACÍA las tablas y recarga datos de prueba
npm test           # node --test (por ahora solo pruebas de humo)

# Frontend (desde frontend/)
npm run dev        # Vite en :5173, abre el navegador
npm run build
```

El backend corre en `:3000`, el frontend en `:5173`. Ambos necesitan su `.env` copiado
desde `.env.example`. Los usuarios de prueba comparten la contraseña `Demo1234`
(administrador: `carolina.nunez@ejemplo.cl`).

Requiere **Node >= 22.5.0** por el módulo integrado `node:sqlite`. El README menciona 20,
pero `package.json` fija 22.5 y es el valor correcto. No hay ESLint ni Prettier: el estilo
se mantiene a mano, imitando el archivo que se está editando.

## Arquitectura: tres capas, sin atajos

```
routes/       → tabla de contenidos: verbo + ruta + middlewares. Sin lógica.
controllers/  → traducen HTTP ↔ negocio. Leer req, llamar al service, responder.
services/     → deciden. Validan, aplican reglas, lanzan ErrorHttp. NO conocen Express.
models/       → el único lugar con SQL. No validan, no deciden códigos HTTP.
db/           → conexión, esquema, transacciones.
utils/        → validación, errores, léxico, similitud. No conocen entidades.
```

Reglas que no se rompen:

- **Un controlador nunca toca la base de datos.** Todo pasa por un service; solo los
  models ejecutan SQL.
- **Los services no reciben `req` ni `res`.** Reciben objetos comunes y devuelven objetos
  comunes; así se prueban sin levantar un servidor.
- **No hay `try/catch` en los controladores.** Express captura lo que se lance en un
  manejador sincrónico y lo envía a `middlewares/errorHandler.js`. Los services lanzan
  `ErrorHttp` con su `status` adentro (`utils/errores.js`: `errorSolicitud` 400,
  `errorProhibido` 403, `errorNoEncontrado` 404, `errorConflicto` 409), y la respuesta
  correcta sale sola.
- **Nadie lee `process.env` salvo `config/env.js`.** El resto importa `config` desde ahí.

### Invariantes de seguridad y de datos

- **La identidad sale siempre del token**, nunca del cuerpo de la petición. El autor de
  una incidencia o de un cambio de estado se toma de `req.usuario.id_usuario`. Aceptarlo
  desde el body permitiría falsificar la bitácora, que es justamente la fuente del índice
  de salud.
- **Todo valor va como parámetro `?` en SQL.** Los nombres de columna sí se concatenan, y
  por eso solo pueden venir de las listas blancas del model (`FILTROS_PERMITIDOS`,
  `CAMPOS_ACTUALIZABLES`, `ORDENES_PERMITIDOS`).
- **Hay dos listas blancas por entidad, y son distintas a propósito.** La del model
  protege contra columnas inventadas; la del service (`CAMPOS_EDITABLES`) protege contra
  operaciones no autorizadas: `estado`, `fecha_resolucion` y `clasificacion_automatica`
  se escriben solo desde adentro del sistema.
- **Las fechas vienen de SQLite, no del reloj de Node.** Usar `ahora()` de
  `db/database.js`. Mezclar relojes produce incidencias resueltas antes de ser creadas y
  métricas de tiempo negativas.
- **Toda operación con más de una escritura va dentro de `enTransaccion()`.** Cambiar
  estado son dos escrituras (INCIDENCIA + HISTORIAL_INCIDENCIA); si la segunda falla, la
  bitácora queda mintiendo y el daño no se arregla después.
- **Los enumerados están duplicados** entre los `CHECK` de `schema.sql` y las constantes
  del service (`PRIORIDADES`, `ESTADOS`, `CATEGORIAS`, roles). Es deliberado: la base es
  la última defensa, pero un `CHECK` fallido daría un 500 incomprensible. **Agregar un
  valor obliga a tocar los dos lugares.**
- **En los archivos de rutas, las rutas fijas van antes que las que llevan `:id`**, y el
  `router.use(requiereAutenticacion)` va arriba de todo para que una ruta nueva no quede
  sin proteger por olvido.

### La máquina de estados

Vive como **dato** en `services/incidencia.service.js` (`TRANSICIONES`), no repartida en
una cadena de `if`. Cambiar el flujo es editar esa tabla. `CERRADA` es final;
`ABIERTA → CERRADA` es el atajo para cierres sin trabajo (duplicada, no se reproduce) y
exige comentario (`TRANSICIONES_QUE_EXIGEN_MOTIVO`). La única vía para cambiar el estado
es `POST /api/incidencias/:id/transicion`, nunca un `PUT` del campo.

### Los tres diferenciadores

| Diferenciador | Dónde se ajusta |
|---|---|
| Clasificación automática | `utils/lexico.js` (datos) + `services/clasificacion.service.js` (decisión) |
| Detección de duplicados | `UMBRAL_DUPLICADO` en `.env` + `services/duplicados.service.js` |
| Índice de salud | pesos y límites en `services/salud.service.js` |

Los tres comparten un criterio que hay que preservar al modificarlos: **nunca
sobreescriben una decisión humana, nunca bloquean, y siempre devuelven la evidencia que
justifica su resultado.** La clasificación rellena solo los campos que quedaron en blanco
y adjunta los términos que la motivaron; el detector de duplicados avisa sin impedir el
registro; el índice entrega el desglose por componente y reporta `SIN_DATOS` en vez de
fingir salud. Los pesos y umbrales son convenciones declaradas, no resultados derivados
de los datos: si se cambian, hay que decir por qué.

## Convenciones de código

- **ESM en todo el proyecto** (`"type": "module"`). Los imports **llevan la extensión**:
  `from './client.js'`, `from '../context/SesionContext.jsx'`.
- **Todo el dominio está en español**: identificadores, funciones, mensajes de error,
  clases CSS, nombres de archivo. `crearIncidencia`, `lanzarSiHayErrores`,
  `ProveedorSesion`, `.cabecera__usuario`.
- **Los `.js` y `.jsx` se escriben sin acentos ni `ñ`**, comentarios incluidos. Las tildes
  aparecen solo en `.md`, en `.sql` y en los textos de dominio de
  `clasificacion.service.js` y `similitud.js`. Al escribir código nuevo, mantener ASCII.
- **El texto que se ve en pantalla sí lleva tildes**, y la regla anterior se sostiene
  escribiéndolas escapadas. Son dos mecanismos distintos y no son intercambiables:
  - **En JSX, entidades HTML**: `<span>Contrase&ntilde;a</span>`,
    `placeholder="Direcci&oacute;n"`. Valen igual en el texto de un elemento que en un
    atributo literal, porque Babel las decodifica al compilar.
  - **En literales de JavaScript, escapes `\u`**: `'Todav\u00eda no hay incidencias'`.
    Aplica a cadenas sueltas, plantillas y todo lo que no pase por JSX; ahí una entidad
    se mostraría tal cual, con el `&ntilde;` a la vista.

  Las dos comprobaciones: `grep -Prn '[^\x00-\x7F]' --include='*.js' --include='*.jsx'
  src` no debe devolver nada, y en el bundle de `dist/` no debe quedar ninguna
  `&entidad;` sin decodificar.

  **Deuda conocida**: los mensajes de error del backend se muestran en la interfaz y
  todavía no llevan tildes (`'Correo o contrasena incorrectos.'`). Les corresponde el
  escape `\u`, por ser literales.
- **SQL**: tablas en MAYÚSCULAS, columnas en `snake_case`, valores de enumerado en
  MAYÚSCULAS. Fechas como TEXT ISO (`YYYY-MM-DD HH:MM:SS`), booleanos como INTEGER 0/1.
- **Comentarios**: cada archivo abre con un bloque que explica su responsabilidad y por
  qué existe; las decisiones no obvias se justifican donde se toman, junto con la
  alternativa descartada. Este estilo es el rasgo más característico del repositorio y hay
  que sostenerlo: el código se lee como parte de la memoria. No explicar lo que el código
  ya dice; explicar lo que no se ve.
- **Validación**: las funciones de `utils/validacion.js` devuelven el valor ya normalizado
  o acumulan en un arreglo `errores`; el service cierra con `lanzarSiHayErrores(errores)`
  para informar todos los problemas en un solo 400. La excepción es `exigirIdValido()`,
  que lanza de inmediato: sin un recurso válido no tiene sentido seguir validando.

### Frontend

- **Sin dependencias más allá de React y `react-router-dom`.** El enrutador entró al
  aparecer la segunda pantalla dentro de la sesión, tal como estaba previsto. `App.jsx`
  sigue decidiendo entre login y aplicación según la sesión, y declara las rutas solo
  para quien ya entró: fuera de sesión no hay nada que enrutar.
- **El estado de una pantalla vive en la dirección, no en `useState`.** El listado guarda
  filtros, orden y página en la cadena de consulta (`?estado=ABIERTA&pagina=2`). Cuesta lo
  mismo y da tres cosas: enlaces que se pueden compartir, el botón atrás deshaciendo el
  último filtro, y recargar sin perder el trabajo.
- **Las dos capas de la máquina de estados no se duplican.** Qué transiciones existen lo
  dice el backend (`transiciones_posibles`, que viene en el detalle y en la respuesta de
  la transición); el frontend solo aporta el texto de los botones y si el motivo es
  obligatorio (`ACCIONES_TRANSICION` en `dominio/incidencias.js`). La regla la hace
  cumplir el servidor: si las dos discrepan, se pide un motivo de más o llega un 400 que
  la pantalla ya muestra junto al campo.
- **Toda llamada HTTP pasa por `api/client.js`**, que adjunta el token, convierte los
  errores en `ErrorApi` (con `status` y `detalles` por campo) y detecta el 401 para cerrar
  la sesión solo. Los archivos de `api/` solo traducen funciones a rutas.
- **`context/SesionContext.jsx` concentra todo lo de "quién está usando la aplicación".**
  Hay tres estados, no dos: `comprobando`, sin sesión y con sesión. Omitir el primero hace
  parpadear el login ante quien sí tiene sesión válida.
- **CSS plano** en `styles/index.css`, variables en `:root`, clases en español con
  separación tipo BEM (`tarjeta--login`, `boton--discreto`). Sin librerías de estilos.

### Pruebas

Las dos suites corren con `node --test` y `assert/strict`. No hay ninguna dependencia de
pruebas añadida al proyecto, y eso es parte del criterio: el ejecutor viene con Node.

**Backend** — `npm test` desde `backend/`. `tests/smoke.test.js` verifica que el esquema
cree las cinco entidades y que `/api/health` responda. Levanta la app en el puerto `0`
para no chocar con el servidor de desarrollo.

**Frontend** — `npm test` desde `frontend/`. `tests/pantallas.test.js` dibuja las
pantallas con `renderToStaticMarkup` y afirma sobre el HTML resultante.
`tests/entorno.js` arranca el propio Vite del proyecto, que es lo que permite importar
`.jsx` desde node, y sustituye el contenido de `usePeticion` y del contexto de sesión por
los dobles de `tests/dobles/`. La sustitución va por el gancho `load` de un plugin y no
por `resolve.alias`: un alias obliga a entregarle a Vite una ruta absoluta del sistema, y
en Windows las barras invertidas no resuelven. **La aplicación no lleva ni una línea
añadida para poder probarse.**

Lo que estas pruebas cubren son las situaciones que cuesta reproducir a mano y que se
rompen sin que nadie lo note: una incidencia que no existe, un estado final sin
transiciones, un sistema sin datos suficientes, el backend apagado. Lo que **no** cubren:
el aspecto (el CSS no se aplica), la interacción (nadie pulsa un botón) y los efectos del
hook de peticiones real. Eso pide un navegador, y es otra decisión.

Siguen pendientes las pruebas funcionales del backend, que son las que ejercitarían la
máquina de estados y los tres diferenciadores contra la base de datos.

## Entorno

Windows con PowerShell. `npm run db:seed` **vacía las tablas**: no ejecutarlo si hay datos
que importen. SQLite corre en modo WAL, así que junto al `.sqlite` aparecen `-shm` y
`-wal`; ninguno de los tres va al repositorio.

Los mensajes de commit van en español, en tercera persona y describen el aporte completo:
`Agrega el índice de salud y las métricas del sistema`.
