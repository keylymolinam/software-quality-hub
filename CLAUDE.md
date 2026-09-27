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
autenticación por rol y los tres diferenciadores). El frontend está en construcción: hoy
existen solo login, cabecera y pantalla de inicio.

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

- **Sin dependencias más allá de React.** No hay enrutador todavía: `App.jsx` decide entre
  login y aplicación según la sesión. El router entra cuando exista la segunda pantalla
  dentro de la sesión.
- **Toda llamada HTTP pasa por `api/client.js`**, que adjunta el token, convierte los
  errores en `ErrorApi` (con `status` y `detalles` por campo) y detecta el 401 para cerrar
  la sesión solo. Los archivos de `api/` solo traducen funciones a rutas.
- **`context/SesionContext.jsx` concentra todo lo de "quién está usando la aplicación".**
  Hay tres estados, no dos: `comprobando`, sin sesión y con sesión. Omitir el primero hace
  parpadear el login ante quien sí tiene sesión válida.
- **CSS plano** en `styles/index.css`, variables en `:root`, clases en español con
  separación tipo BEM (`tarjeta--login`, `boton--discreto`). Sin librerías de estilos.

### Pruebas

Solo `backend/tests/smoke.test.js` (`node:test` + `assert/strict`): verifica que el
esquema y `/api/health` respondan. Levanta la app en el puerto `0` para no chocar con el
servidor de desarrollo. Las pruebas funcionales están pendientes.

## Entorno

Windows con PowerShell. `npm run db:seed` **vacía las tablas**: no ejecutarlo si hay datos
que importen. SQLite corre en modo WAL, así que junto al `.sqlite` aparecen `-shm` y
`-wal`; ninguno de los tres va al repositorio.

Los mensajes de commit van en español, en tercera persona y describen el aporte completo:
`Agrega el índice de salud y las métricas del sistema`.
