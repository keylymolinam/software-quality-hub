# Software Quality Hub

Sistema de gestión de incidencias de software desarrollado como proyecto de título de
Ingeniería en Computación e Informática.

> **Estado:** en construcción. API REST operativa con las tres entidades principales
> (incidencias, proyectos y usuarios), máquina de estados con bitácora de cambios y
> autenticación. Pendientes: los tres diferenciadores y la interfaz de usuario.

## Diferenciadores

1. **Motor de clasificación automática** de categoría y prioridad basado en reglas léxicas.
2. **Detección de incidencias duplicadas** por similitud de texto. *(implementado)*
   Coeficiente de Jaccard sobre las palabras de título y descripción, comparando
   contra las incidencias no cerradas del mismo proyecto. Si supera el umbral
   (`UMBRAL_DUPLICADO`, 0.45), guarda la referencia en `posible_duplicado_de` y
   avisa en la respuesta, **sin impedir el registro**: el algoritmo compara
   palabras, no comprende el problema, y la decisión final es de quien reporta.
3. **Índice de salud / deuda técnica** calculado desde la antigüedad de incidencias abiertas,
   la tasa de reapertura y la densidad por categoría.

## Stack técnico

| Componente | Tecnología |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Base de datos | SQLite (better-sqlite3) |
| Arquitectura | Tres capas: presentación, lógica de negocio, persistencia |

## Estructura del proyecto

```
software-quality-hub/
├── backend/          API REST (Node.js + Express)
├── frontend/         Interfaz de usuario (React + Vite)
└── docs/             Diagramas y material de documentación
```

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

- Node.js 20 o superior (probado en v24.19.0)
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

### Resumen de puertos

| Servicio | Puerto | URL |
|---|---|---|
| Backend (API) | 3000 | http://localhost:3000 |
| Frontend (UI) | 5173 | http://localhost:5173 |

> El backend permite peticiones desde el origen definido en `CORS_ORIGIN`
> (`backend/.env`). Si cambias el puerto del frontend, actualiza esa variable.

## Autenticación

Salvo `/api/health` y el propio inicio de sesión, **todas las rutas exigen un token**.
Se obtiene con `POST /api/auth/login` y se envía en cada petición siguiente:

```
Authorization: Bearer <token>
```

Los usuarios de prueba comparten la contraseña **`Demo1234`**. Para entrar como
administrador:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"correo_electronico\":\"carolina.nunez@ejemplo.cl\",\"contrasena\":\"Demo1234\"}"
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

Cambiar una contraseña es la única operación que ni un administrador puede hacer
por otra persona: exige conocer la contraseña vigente.

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
| `DELETE` | `/api/usuarios/:id` | Elimina; falla si tiene incidencias o historial |

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

### Empezar desde cero

Si se requiere descartar la base por completo, basta con eliminar el archivo y
volver a ejecutar el proyecto:

```bash
del backend\data\software_quality_hub.sqlite    # Windows
rm backend/data/software_quality_hub.sqlite     # macOS / Linux
```

## Autor

Miguel M. — Proyecto de título, Ingeniería en Computación e Informática.
