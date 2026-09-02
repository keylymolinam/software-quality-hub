# Software Quality Hub

Sistema de gestión de incidencias de software desarrollado como proyecto de título de
Ingeniería en Computación e Informática.

> **Estado:** en construcción — Semana 2 de 12 (estructura del proyecto).

## Diferenciadores

1. **Motor de clasificación automática** de categoría y prioridad basado en reglas léxicas.
2. **Detección de incidencias duplicadas** por similitud de texto.
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

## Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Verifica que la API y la base de datos estén operativas |

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

### Empezar desde cero

Si se requiere descartar la base por completo, basta con eliminar el archivo y
volver a ejecutar el proyecto:

```bash
del backend\data\software_quality_hub.sqlite    # Windows
rm backend/data/software_quality_hub.sqlite     # macOS / Linux
```

## Autor

Miguel M. — Proyecto de título, Ingeniería en Computación e Informática.
