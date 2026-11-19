# Software Quality Hub

Sistema de gestión de incidencias de software desarrollado como proyecto de título de
Ingeniería en Computación e Informática.

> **Estado:** funcional de punta a punta. La **API REST** está completa: las tres
> entidades principales (incidencias, proyectos y usuarios), la máquina de estados
> con bitácora de cambios, la autenticación con control de acceso por rol y los tres
> diferenciadores. El **frontend** recorre el ciclo de trabajo completo en nueve
> pantallas, y los tres diferenciadores se ven en pantalla. Hay **92 pruebas
> automatizadas**: 33 del backend y 49 de las pantallas, que corren con el ejecutor
> que viene con Node, y 10 de interacción, que recorren el sistema en un navegador
> real con Playwright.

## Diferenciadores

1. **Motor de clasificación automática** de categoría y prioridad basado en reglas
   léxicas. *(implementado)* Busca términos conocidos en el título y la descripción,
   suma sus pesos y se queda con la categoría más puntuada; la prioridad parte de la
   típica de esa categoría y se ajusta según señales de alcance y gravedad. Solo
   rellena los campos que quien reporta dejó en blanco, **nunca sobreescribe una
   elección humana**, y cada resultado viene con los términos que lo justifican.
   El diccionario vive en `backend/src/utils/lexico.js`: ajustarlo es editar
   palabras, no código.
2. **Detección de incidencias duplicadas** por similitud de texto. *(implementado)*
   Coeficiente de Jaccard sobre las palabras de título y descripción, comparando
   contra las incidencias no cerradas del mismo proyecto. Si supera el umbral
   (`UMBRAL_DUPLICADO`, 0.45), guarda la referencia en `posible_duplicado_de` y
   avisa en la respuesta, **sin impedir el registro**: el algoritmo compara
   palabras, no comprende el problema, y la decisión final es de quien reporta.
3. **Índice de salud / deuda técnica** calculado desde la antigüedad de incidencias
   abiertas, la tasa de reapertura y la densidad por categoría. *(implementado)*
   Resume el estado de un proyecto en un número de 0 a 100 —donde 100 es el estado
   ideal— y **entrega siempre el desglose que lo produjo**: cada componente con su
   puntaje, su peso y los datos de los que sale. Los pesos y los límites son una
   convención declarada, no un resultado derivado de los datos; están en un solo
   lugar (`backend/src/services/salud.service.js`) para poder discutirlos y
   recalcular. Un proyecto sin incidencias se informa como `SIN_DATOS`, no como
   saludable: no está sano, está sin medir.

## Stack técnico

| Componente | Tecnología |
|---|---|
| Frontend | React 19 + react-router-dom 7, compilado con Vite 8 |
| Backend | Node.js ≥ 22.5 + Express 5 |
| Base de datos | SQLite, con el módulo integrado `node:sqlite` (sin ORM) |
| Autenticación | JWT (`jsonwebtoken`) + hash bcrypt (`bcryptjs`) |
| Pruebas | `node --test` y `assert/strict`; Playwright para las de interacción |
| Arquitectura | Tres capas: presentación, lógica de negocio, persistencia |

Dos ausencias que son decisiones, no omisiones:

- **No hay ORM.** Todo el SQL está escrito a mano y vive solo en
  `backend/src/models/`. El esquema es el documento del modelo de datos, no un
  subproducto de unas clases.
- **El frontend no tiene dependencias más allá de React y el enrutador.** Sin
  librería de estado, sin cliente HTTP, sin librería de estilos y sin librería de
  gráficos: las figuras de datos son barras hechas con dos `div` y un `width` en
  porcentaje.

`node:sqlite` se prefiere a una librería externa porque no requiere compilar
código nativo: la instalación del proyecto no puede fallar por falta de
herramientas de compilación en la máquina.

## Estructura del proyecto

```
software-quality-hub/
├── backend/              API REST (Node.js + Express)
│   ├── src/
│   │   ├── routes/       verbo + ruta + permisos
│   │   ├── controllers/  traducen HTTP a negocio
│   │   ├── services/     deciden: validan y aplican las reglas
│   │   ├── models/       el único lugar con SQL
│   │   ├── db/           conexión, esquema y datos de prueba
│   │   ├── middlewares/  autenticación por rol y manejo de errores
│   │   └── utils/        validación, errores, léxico y similitud
│   └── tests/            smoke.test.js y funcionales.test.js
├── frontend/             Interfaz de usuario (React + Vite)
│   ├── src/
│   │   ├── pages/        una por pantalla
│   │   ├── components/   piezas reutilizables
│   │   ├── api/          una función por ruta, sobre client.js
│   │   ├── context/      la sesión
│   │   ├── hooks/        peticiones y sugerencia de clasificación
│   │   ├── dominio/      el texto legible de cada valor
│   │   └── styles/       CSS plano
│   ├── tests/            cuatro archivos + sus dobles
│   └── e2e/              pruebas de interacción (Playwright)
└── docs/
    ├── modelo-datos.md   Diccionario de datos y decisiones de diseño
    └── diagramas/        Figuras en Mermaid
```

Las cuatro figuras del proyecto están en [`docs/diagramas/`](docs/diagramas/):
el [modelo entidad-relación](docs/diagramas/modelo-entidad-relacion.md), la
[máquina de estados](docs/diagramas/maquina-de-estados.md), la
[arquitectura en tres capas](docs/diagramas/arquitectura.md) y las
[pantallas del frontend](docs/diagramas/frontend.md). GitHub las renderiza al
abrir cada archivo.

### Mapeo a la arquitectura de tres capas

| Capa | Ubicación |
|---|---|
| Presentación | `frontend/` + `backend/src/routes` + `backend/src/controllers` |
| Lógica de negocio | `backend/src/services` |
| Persistencia | `backend/src/models` + `backend/src/db` |

Regla de diseño: los controladores nunca acceden directamente a la base de datos.
Toda operación pasa por un *service*, y solo los *models* ejecutan SQL.

## Cómo ejecutar el proyecto

### Requisitos previos

- Node.js **22.5 o superior** (probado en v24.19.0). La versión no es negociable: la base
  de datos usa el módulo integrado `node:sqlite`, que aparece en 22.5. En Node 20 el
  backend no arranca.
- npm 10 o superior

### Backend

```bash
cd backend
npm install              # instala las dependencias
cp .env.example .env     # en Windows: copy .env.example .env
npm run db:seed          # crea la base de datos y carga datos de prueba
npm run dev              # modo desarrollo, se reinicia solo al guardar cambios
```

El servidor queda disponible en `http://localhost:3000`.

Para verificar que arrancó correctamente, abre en el navegador:
`http://localhost:3000/api/health`

Respuesta esperada:

```json
{
  "estado": "operativo",
  "servicio": "Software Quality Hub API",
  "version": "0.1.0",
  "entorno": "development",
  "baseDatos": {
    "conectada": true,
    "motor": "SQLite",
    "registros": { "usuarios": 5, "proyectos": 4, "incidencias": 12 }
  },
  "marcaTiempo": "2026-08-31T18:47:00.179Z"
}
```

| Comando | Descripción |
|---|---|
| `npm run dev` | Desarrollo, con reinicio automático al guardar |
| `npm start` | Ejecución normal, sin reinicio automático |
| `npm run db:seed` | Vacía la base y recarga los datos de prueba |
| `npm test` | Ejecuta las pruebas automatizadas |

### Frontend

En **otra terminal** (el backend debe quedar corriendo en la primera):

```bash
cd frontend
npm install              # instala las dependencias
cp .env.example .env     # en Windows: copy .env.example .env
npm run dev              # abre el navegador automáticamente
```

La interfaz queda disponible en `http://localhost:5173`.

Si backend y frontend están correctamente conectados, la pantalla de inicio
muestra el indicador **"API conectada"** con los datos del servicio.

| Comando | Descripción |
|---|---|
| `npm run dev` | Desarrollo, con recarga automática al guardar |
| `npm run build` | Compila la versión de producción en `dist/` |
| `npm run preview` | Previsualiza la versión compilada |
| `npm test` | Ejecuta las pruebas de las pantallas |
| `npm run test:e2e` | Ejecuta las pruebas de interacción en un navegador |

### Resumen de puertos

| Servicio | Puerto | URL |
|---|---|---|
| Backend (API) | 3000 | http://localhost:3000 |
| Frontend (UI) | 5173 | http://localhost:5173 |

> El backend permite peticiones desde el origen definido en `CORS_ORIGIN`
> (`backend/.env`). Si cambias el puerto del frontend, actualiza esa variable.

## Pantallas

Nueve pantallas, que cubren todo lo que la API ofrece. El mapa de navegación y el
reparto en capas están en la figura
[`docs/diagramas/frontend.md`](docs/diagramas/frontend.md).

| Pantalla | Ruta | Qué resuelve |
|---|---|---|
| Login | — (fuera de sesión) | La única sin sesión; `App.jsx` decide cuál mostrar |
| Inicio | `/` | El índice global como número y la lista por proyecto, de peor a mejor |
| Listado | `/incidencias` | Filtros, búsqueda, orden y paginación, todo en la dirección |
| Registro | `/incidencias/nueva` | Clasificación sugerida en vivo y aviso de duplicados |
| Detalle | `/incidencias/:id` | Transiciones de estado, bitácora y descarte del duplicado |
| Edición | `/incidencias/:id/editar` | Corrige los campos que el sistema no controla |
| Salud | `/salud?proyecto=N` | Desglose del índice: los tres componentes con su peso y su evidencia |
| Proyectos | `/proyectos` | El listado para todos; crear, editar y eliminar para el administrador |
| Usuarios | `/usuarios` | El equipo, con las seis reglas de acceso reflejadas en la tabla |

Tres decisiones que se notan al usarla:

- **El estado de una pantalla vive en la dirección, no en memoria.** El listado
  guarda filtros, orden y página en la cadena de consulta
  (`?estado=ABIERTA&pagina=2`). Eso da enlaces que se pueden compartir, el botón
  atrás deshaciendo el último filtro, y recargar sin perder el trabajo.
- **La interfaz refleja los permisos; no los hace cumplir.** Esconder un botón no
  es seguridad: el rol se comprueba en el servidor. Lo que la pantalla aporta es no
  ofrecer algo que iba a responder 403. Por eso `/proyectos` y `/usuarios` son una
  sola pantalla por entidad con las acciones condicionadas al rol, y no una sección
  de administración aparte.
- **La máquina de estados no se duplica en el cliente.** Qué transiciones existen
  lo dice el backend en `transiciones_posibles`; el frontend solo aporta el texto
  de los botones.

## Autenticación

Salvo `/api/health` y el propio inicio de sesión, **todas las rutas exigen un token**.
Se obtiene con `POST /api/auth/login` y se envía en cada petición siguiente:

```
Authorization: Bearer <token>
```

Los usuarios de prueba comparten la contraseña **`Demo1234`**, y su correo dice
el rol:

| Correo | Rol |
|---|---|
| `superusuario@ejemplo.cl` | ADMINISTRADOR |
| `desarrollador1@ejemplo.cl` | DESARROLLADOR |
| `desarrollador2@ejemplo.cl` | DESARROLLADOR |
| `tester@ejemplo.cl` | TESTER |
| `analista@ejemplo.cl` | ANALISTA |

Para entrar como administrador:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"correo_electronico\":\"superusuario@ejemplo.cl\",\"contrasena\":\"Demo1234\"}"
```

La respuesta incluye `token`, su vigencia y los datos del usuario. La contraseña
nunca se guarda en texto plano: se almacena su hash bcrypt, y ninguna respuesta
de la API devuelve esa columna.

> En producción, `JWT_SECRET` es obligatorio en el archivo `.env`; el servidor se
> niega a arrancar sin él. En desarrollo usa una clave fija y avisa por consola.

Quién es el autor de una incidencia o de un cambio de estado **sale siempre del
token**, nunca del cuerpo de la petición: de lo contrario, la bitácora que
alimenta el índice de salud podría falsificarse.

### Permisos por rol

| Recurso | Leer | Crear | Editar | Eliminar |
|---|---|---|---|---|
| Incidencias | cualquier sesión | cualquier sesión | cualquier sesión | `ADMINISTRADOR` |
| Proyectos | cualquier sesión | `ADMINISTRADOR` | `ADMINISTRADOR` | `ADMINISTRADOR` |
| Usuarios | cualquier sesión | `ADMINISTRADOR` | uno mismo o `ADMINISTRADOR` | `ADMINISTRADOR` |

Cambiar una contraseña exige conocer la vigente, así que solo lo hace su dueño.
Si alguien **olvida su contraseña**, un administrador la restablece desde la
pantalla Usuarios con una clave temporal, que la persona cambia después por una
suya. El administrador no puede usar esa vía sobre su propia cuenta. La pantalla
de login lo explica en el enlace *¿Olvidaste tu contraseña?*.

Se eligió esta vía y no un enlace por correo porque el sistema es interno: un
administrador ya da de alta las cuentas, y el correo exigiría un servidor SMTP,
enlaces con vencimiento y dos pantallas más. El enlace por correo queda como
trabajo futuro.

## Endpoints disponibles

### Servicio

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Verifica que la API y la base de datos estén operativas |

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Inicia sesión y devuelve un token |
| `GET` | `/api/auth/yo` | Datos del usuario de la sesión actual |

### Incidencias

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/incidencias` | Listado con filtros, búsqueda, orden y paginación |
| `POST` | `/api/incidencias` | Crea una incidencia (nace `ABIERTA`) |
| `GET` | `/api/incidencias/:id` | Detalle de una incidencia |
| `PUT` | `/api/incidencias/:id` | Actualización parcial (no el estado) |
| `DELETE` | `/api/incidencias/:id` | Elimina la incidencia y su bitácora |
| `POST` | `/api/incidencias/:id/transicion` | Cambia el estado según el flujo permitido |
| `GET` | `/api/incidencias/:id/historial` | Bitácora de cambios de estado |
| `POST` | `/api/incidencias/clasificar` | Vista previa de la clasificación, sin crear nada |

Filtros del listado: `estado`, `prioridad`, `categoria`, `id_proyecto`,
`asignado_a`, `reportado_por`, `busqueda`, `ordenarPor`, `direccion`, `pagina`,
`limite`.

### Proyectos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/proyectos` | Listado con recuento de incidencias por proyecto |
| `POST` | `/api/proyectos` | Crea un proyecto |
| `GET` | `/api/proyectos/:id` | Detalle de un proyecto |
| `PUT` | `/api/proyectos/:id` | Actualización parcial |
| `DELETE` | `/api/proyectos/:id` | Elimina; falla si tiene incidencias asociadas |

### Usuarios

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/usuarios` | Listado con filtro por rol y búsqueda |
| `POST` | `/api/usuarios` | Crea un usuario |
| `GET` | `/api/usuarios/:id` | Detalle de un usuario |
| `PUT` | `/api/usuarios/:id` | Actualización parcial (no la contraseña) |
| `PUT` | `/api/usuarios/:id/contrasena` | Cambia la contraseña; exige la actual |
| `PUT` | `/api/usuarios/:id/restablecer-contrasena` | Restablece la de otra persona (`ADMINISTRADOR`) |
| `DELETE` | `/api/usuarios/:id` | Elimina; falla si tiene incidencias o historial |

### Métricas e índice de salud

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/metricas/salud` | Índice global y de cada proyecto, de peor a mejor |
| `GET` | `/api/metricas/salud/:id` | Índice de un proyecto, con su desglose |
| `GET` | `/api/metricas/historico` | Evolución de una métrica en el tiempo |
| `POST` | `/api/metricas/snapshot` | Guarda la medición actual en `METRICA` (`ADMINISTRADOR`) |

`/api/metricas/historico` acepta `tipo_metrica` (`INDICE_SALUD`, `TASA_REAPERTURA`,
`ANTIGUEDAD_MEDIA_DIAS`, `CONCENTRACION_CATEGORIA`) e `id_proyecto` (un id, o
`TODOS`). Sin `id_proyecto` devuelve la serie global: una serie de tiempo debe ser
de una sola cosa.

El `snapshot` guarda los cuatro valores y no solo el índice, porque un índice que
baja no dice **por qué** bajó. Con los componentes guardados se puede reconstruir
después si la causa fue la antigüedad acumulada o las reaperturas.

### Códigos de respuesta

| Código | Significado en esta API |
|---|---|
| `400` | Los datos enviados no son válidos. El campo `detalles` lista cada problema |
| `401` | No hay sesión, o el token es inválido o expiró |
| `403` | Hay sesión, pero el rol no alcanza para esta operación |
| `404` | El recurso no existe |
| `409` | Los datos son válidos, pero chocan con el estado actual del sistema |

La diferencia entre `400` y `409` es deliberada: un `409` no significa que la
petición esté mal escrita, sino que no corresponde *ahora*. Pasar una incidencia
de `ABIERTA` a `RESUELTA`, o eliminar un proyecto que todavía tiene incidencias,
son peticiones bien formadas que podrían funcionar más adelante.

## Base de datos

El motor es **SQLite**, accedido mediante el módulo `node:sqlite` integrado en
Node.js. No requiere instalar ningún servidor ni compilar dependencias nativas:
la base de datos es un único archivo que se genera automáticamente en
`backend/data/software_quality_hub.sqlite` la primera vez que se ejecuta el
proyecto.

| Archivo | Contenido |
|---|---|
| `backend/src/db/schema.sql` | Definición de tablas, restricciones e índices |
| `backend/src/db/seed.sql` | Datos de prueba |
| `backend/src/db/database.js` | Apertura de la conexión y creación del esquema |
| `backend/src/db/seed.js` | Script de carga de datos de prueba |
| `docs/modelo-datos.md` | Diagrama entidad-relación y diccionario de datos |

**Entidades:** USUARIO, PROYECTO, INCIDENCIA, HISTORIAL_INCIDENCIA, METRICA.

### Recargar los datos de prueba

```bash
cd backend
npm run db:seed
```

El comando vacía las tablas y las repuebla. Es seguro ejecutarlo las veces que
se necesite durante el desarrollo.

Los cinco usuarios de prueba quedan con la contraseña **`Demo1234`**, guardada
como hash bcrypt. Para regenerar el hash con otra contraseña:

```bash
node -e "console.log(require('bcryptjs').hashSync('TuClave', 10))"
```

y reemplazar el valor en `backend/src/db/seed.sql`.

## Pruebas

Las dos primeras suites corren con `node --test` y `assert/strict`, sin ninguna
dependencia de pruebas: el ejecutor viene con Node. La tercera es la excepción, y
es deliberada: pulsar un botón pide un navegador, y Node no trae uno.

| Suite | Comando | Archivos | Pruebas |
|---|---|---|---|
| Backend | `npm test` desde `backend/` | 2 | 33 |
| Pantallas | `npm test` desde `frontend/` | 4 | 49 |
| Interacción | `npm run test:e2e` desde `frontend/` | 4 | 10 |

### Cómo ejecutarlas

Las tres necesitan las dependencias instaladas (`npm install` en `backend/` y en
`frontend/`). La de interacción necesita además el navegador, que se descarga una
sola vez por máquina:

```bash
cd frontend
npx playwright install chromium
```

Luego, cada suite por separado:

```bash
# Backend: humo y funcionales
cd backend
npm test

# Pantallas, sin navegador
cd frontend
npm test

# Interacción, en Chromium
cd frontend
npm run test:e2e
```

La de interacción no pide nada encendido: levanta por su cuenta el backend (en el
puerto 3100) y el frontend (en el 5174), con su propia base. Se puede ejecutar con
el entorno de desarrollo abierto, y no toca los datos de la demo. Si una prueba
falla, deja en `frontend/test-results/` una traza que se abre con
`npx playwright show-trace <ruta del trace.zip>`.

**Backend.** `tests/smoke.test.js` verifica que el esquema cree las cinco
entidades, que las claves foráneas estén activadas y que `/api/health` responda;
levanta la app en el puerto `0` para no chocar con el servidor de desarrollo.
`tests/funcionales.test.js` ejercita las reglas de negocio contra una base de
datos de verdad: la máquina de estados completa (el flujo legal, los saltos
prohibidos, el estado final, el motivo obligatorio del atajo y cómo sigue la
`fecha_resolucion` al estado), los tres diferenciadores y la invariante de que la
identidad sale de la sesión. Usa **su propia base**
(`data/pruebas-funcionales.sqlite`, ignorada por git) y vacía las tablas antes de
cada prueba, lo que con la base de desarrollo habría borrado datos en uso.

**Frontend.** Cuatro archivos dibujan las pantallas con `renderToStaticMarkup` y
afirman sobre el HTML resultante. Cambiando quién está usando la aplicación se
comprueban **las dos caras de cada permiso**: que la acción aparezca para quien
puede y que no aparezca para quien no. La aplicación no lleva ni una línea añadida
para poder probarse: los dobles se inyectan desde el propio Vite del proyecto.

Lo que estas pruebas cubren son las situaciones que cuesta reproducir a mano y
que se rompen sin que nadie lo note: una incidencia que no existe, un estado final
sin transiciones, un sistema sin datos suficientes, el backend apagado.

Lo que **no** cubren: el aspecto (el CSS no se aplica), la interacción (nadie
pulsa un botón) y los efectos del hook de peticiones real.

**Interacción.** Eso es lo que cubre la tercera suite. Playwright levanta el
backend y el frontend de verdad, en puertos propios (3100 y 5174) y con su propia
base (`data/pruebas-e2e.sqlite`, recargada con el seed al empezar), y recorre el
sistema en Chromium: entrar y salir, la sugerencia del motor mientras se escribe,
el aviso de duplicado al registrar, el error del servidor junto al campo, la
máquina de estados completa con su bitácora, el motivo obligatorio en sus dos
capas (navegador y servidor), descartar un duplicado y los filtros en la
dirección con el botón atrás. La primera vez hay que descargar el navegador:

```bash
npx playwright install chromium
```

> **Una suite verde que nunca se ha visto fallar no dice nada.** Las tres se
> comprobaron rompiendo el código a propósito y verificando que cada rotura hiciera
> fallar exactamente una prueba: permitir `ABIERTA → RESUELTA`, vaciar las
> transiciones que exigen motivo, descuadrar los pesos del índice, mostrar el
> índice sin datos suficientes y dejar de marcar las reaperturas; y en la de
> interacción, quitar el `required` del motivo, filtrar sin dejar rastro en el
> historial y descartar la sugerencia del motor.

### Empezar desde cero

Si se requiere descartar la base por completo, basta con eliminar el archivo y
volver a ejecutar el proyecto:

```bash
del backend\data\software_quality_hub.sqlite    # Windows
rm backend/data/software_quality_hub.sqlite     # macOS / Linux
```

## Evaluación del clasificador

Las pruebas comprueban que el motor de clasificación **funcione**; esta evaluación
mide **cuánto acierta**. Todo está en `backend/evaluacion/`:

| Archivo | Contenido |
|---|---|
| `INSTRUCCIONES.md` | Cómo se etiquetaron los casos y las reglas para que la medición valga |
| `casos-clasificacion.csv` | 48 incidencias de ejemplo con la categoría y prioridad de referencia |
| `evaluar.js` | Compara la referencia con la respuesta del motor y reporta la exactitud |

```bash
# Desde backend/
node evaluacion/evaluar.js
```

### Cómo se midió

- Los 48 casos se escribieron **sin mirar el léxico** del motor, y la autora decidió
  la respuesta correcta de cada uno **sin consultar al motor**.
- Los casos se dividen en dos grupos fijos: los **impares** son de desarrollo (se
  pueden mirar sus errores para ajustar el léxico) y los **pares** son de prueba
  (solo se informa su exactitud, nunca caso por caso). Así un ajuste no puede
  aprenderse las respuestas del examen.
- El script se niega a correr si falta una etiqueta, para que nadie vea las
  respuestas del motor antes de terminar la referencia.

### Resultados

| Grupo | Categoría, léxico original | Categoría, léxico ajustado | Prioridad, original → ajustado |
|---|---|---|---|
| Desarrollo (impares) | 5 de 24 | 12 de 24 | 18 → 17 de 24 |
| **Prueba (pares)** | **5 de 24** | **5 de 24** | **9 → 10 de 24** |
| Los 48 | 10 de 48 | — | 27 de 48 (original) |

La cifra que vale para el léxico ajustado es la de los **pares**: los impares
subieron porque el ajuste se hizo mirando sus errores. En los pares la categoría no
cambió, de modo que **el ajuste no mostró mejora** fuera de los casos que lo
motivaron. Con 24 casos cada acierto vale unos 4 puntos porcentuales, así que el
punto que ganó la prioridad no alcanza para atribuirlo al cambio.

### Limitaciones declaradas

- **Una sola persona** hizo la referencia. No hay medición de acuerdo entre dos
  personas, que sería el techo realista para el motor.
- Cuatro casos de desarrollo (#7, #31, #37 y #43) se **reetiquetaron según las
  definiciones** después de la primera evaluación; la columna `notas` del CSV
  registra el valor anterior. Son impares, así que no afectan el resultado de
  prueba.
- La mayoría de los errores son textos sin ningún término del léxico, que el motor
  deja en `OTRO` a propósito: prefiere no clasificar antes que adivinar. Es el límite
  propio de un clasificador por palabras clave.

## Autor

Keyly Anyely Molina Montoya — Proyecto de título, Ingeniería en Computación e Informática.
