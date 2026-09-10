# Modelo de datos — Software Quality Hub

Documento de apoyo al Capítulo IV.4 (modelo de datos) y IV.5 (flujo de estados)
de la memoria de título.

Implementación de referencia: `backend/src/db/schema.sql`
Motor: SQLite 3

---

## 1. Diagrama entidad-relación

```
                       ┌───────────────────────────────┐
                       │           USUARIO             │
                       ├───────────────────────────────┤
                       │ PK  id_usuario                │
                       │     nombre                    │
                       │     correo_electronico  (UQ)  │
                       │     contrasena_hash           │
                       │     rol                       │
                       │     fecha_creacion            │
                       └───────────────────────────────┘
                         │            │            │
            reporta (1:N)│            │            │modifica (1:N)
                         │            │se le       │
                         │            │asigna      └──────────────┐
                         │            │(1:N, op.)                 │
                         ▼            ▼                           │
 ┌──────────────────────┐   ┌──────────────────────────────────┐  │
 │       PROYECTO       │   │           INCIDENCIA             │  │
 ├──────────────────────┤   ├──────────────────────────────────┤  │
 │ PK  id_proyecto      │   │ PK  id_incidencia                │  │
 │     nombre           │1  │     titulo                       │  │
 │     descripcion      │───┤     descripcion                  │  │
 │     fecha_inicio     │  N│     prioridad                    │  │
 │     estado           │   │     estado                       │  │
 └──────────────────────┘   │     categoria                    │  │
          │ 1               │     fecha_creacion               │  │
          │                 │     fecha_resolucion             │  │
          │                 │     clasificacion_automatica     │  │
          │ N               │ FK  posible_duplicado_de ──┐     │  │
          ▼                 │ FK  id_proyecto            │(au- │  │
 ┌──────────────────────┐   │ FK  reportado_por          │ to- │  │
 │       METRICA        │   │ FK  asignado_a             │ ref)│  │
 ├──────────────────────┤   └────────────────────────────┼─────┘  │
 │ PK  id_metrica       │            │  ▲                │        │
 │     tipo_metrica     │          1 │  └────────────────┘        │
 │     valor            │            │                            │
 │     fecha_calculo    │            │ N                          │
 │ FK  id_proyecto (op.)│            ▼                            │
 └──────────────────────┘   ┌──────────────────────────────────┐  │
                            │      HISTORIAL_INCIDENCIA        │  │
                            ├──────────────────────────────────┤  │
                            │ PK  id_historial                 │  │
                            │     estado_anterior              │  │
                            │     estado_nuevo                 │  │
                            │     fecha_cambio                 │  │
                            │     comentario                   │  │
                            │ FK  id_incidencia                │  │
                            │ FK  modificado_por  ◄────────────┼──┘
                            └──────────────────────────────────┘

  PK = clave primaria    FK = clave foránea    UQ = valor único
```

### Cardinalidades

| Relación | Cardinalidad | Obligatoriedad |
|---|---|---|
| PROYECTO — INCIDENCIA | 1 : N | Toda incidencia pertenece a un proyecto |
| USUARIO — INCIDENCIA (reportado_por) | 1 : N | Toda incidencia tiene un reportante |
| USUARIO — INCIDENCIA (asignado_a) | 1 : N | Opcional: puede estar sin asignar |
| INCIDENCIA — HISTORIAL_INCIDENCIA | 1 : N | Un historial pertenece a una incidencia |
| INCIDENCIA — INCIDENCIA (posible_duplicado_de) | 1 : N reflexiva | Opcional: solo si se detecta similitud |
| PROYECTO — METRICA | 1 : N | Opcional: si es nula, la métrica es global |
| USUARIO — HISTORIAL_INCIDENCIA (modificado_por) | 1 : N | Todo cambio de estado registra a su autor |

---

## 2. Diccionario de datos

### USUARIO

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_usuario | INTEGER | PK, autoincremental | Identificador único |
| nombre | TEXT | NOT NULL | Nombre completo |
| correo_electronico | TEXT | NOT NULL, UNIQUE | Correo; identifica al usuario en el inicio de sesión |
| contrasena_hash | TEXT | NOT NULL | Huella irreversible de la contraseña (bcrypt) |
| rol | TEXT | NOT NULL, CHECK | ADMINISTRADOR · DESARROLLADOR · TESTER · ANALISTA |
| fecha_creacion | TEXT | NOT NULL, por defecto ahora | Fecha de alta (ISO-8601) |

### PROYECTO

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_proyecto | INTEGER | PK, autoincremental | Identificador único |
| nombre | TEXT | NOT NULL | Nombre del proyecto |
| descripcion | TEXT | — | Descripción libre |
| fecha_inicio | TEXT | — | Fecha de inicio (ISO-8601) |
| estado | TEXT | NOT NULL, CHECK | ACTIVO · FINALIZADO · PAUSADO |

### INCIDENCIA

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_incidencia | INTEGER | PK, autoincremental | Identificador único |
| titulo | TEXT | NOT NULL | Resumen breve |
| descripcion | TEXT | NOT NULL | Detalle; es el texto que analizan el motor de clasificación y el detector de duplicados |
| prioridad | TEXT | NOT NULL, CHECK | ALTA · MEDIA · BAJA |
| estado | TEXT | NOT NULL, CHECK, por defecto ABIERTA | ABIERTA · EN_PROGRESO · RESUELTA · CERRADA |
| categoria | TEXT | NOT NULL, CHECK | DISPONIBILIDAD · RENDIMIENTO · SEGURIDAD · USABILIDAD_INTERFAZ · DATOS_INTEGRIDAD · OTRO |
| fecha_creacion | TEXT | NOT NULL, por defecto ahora | Fecha de registro |
| fecha_resolucion | TEXT | Nulo | Se completa al pasar a RESUELTA |
| clasificacion_automatica | INTEGER | NOT NULL, CHECK (0/1), por defecto 0 | 1 = categoría y prioridad asignadas por el motor de reglas; 0 = asignadas por una persona |
| posible_duplicado_de | INTEGER | FK → INCIDENCIA, nulo | Incidencia con similitud sobre el umbral |
| id_proyecto | INTEGER | FK → PROYECTO, NOT NULL | Proyecto al que pertenece |
| reportado_por | INTEGER | FK → USUARIO, NOT NULL | Usuario que la registró |
| asignado_a | INTEGER | FK → USUARIO, nulo | Usuario responsable de resolverla |

### HISTORIAL_INCIDENCIA

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_historial | INTEGER | PK, autoincremental | Identificador único |
| estado_anterior | TEXT | CHECK, nulo | Estado previo; nulo en el registro de creación |
| estado_nuevo | TEXT | NOT NULL, CHECK | Estado resultante |
| fecha_cambio | TEXT | NOT NULL, por defecto ahora | Momento del cambio |
| comentario | TEXT | — | Justificación del cambio |
| id_incidencia | INTEGER | FK → INCIDENCIA, NOT NULL | Incidencia afectada |
| modificado_por | INTEGER | FK → USUARIO, NOT NULL | Usuario que efectuó el cambio |

### METRICA

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_metrica | INTEGER | PK, autoincremental | Identificador único |
| tipo_metrica | TEXT | NOT NULL | Métrica calculada (ej. tasa de reapertura, índice de salud) |
| valor | REAL | NOT NULL | Resultado del cálculo |
| fecha_calculo | TEXT | NOT NULL, por defecto ahora | Momento del cálculo |
| id_proyecto | INTEGER | FK → PROYECTO, nulo | Proyecto asociado; nulo = métrica global |

---

## 3. Flujo de estados de una incidencia

```
   ┌───────────┐        ┌──────────────┐        ┌───────────┐        ┌───────────┐
   │  ABIERTA  │ ─────► │ EN_PROGRESO  │ ─────► │ RESUELTA  │ ─────► │  CERRADA  │
   └───────────┘        └──────────────┘        └───────────┘        └───────────┘
         │                     ▲                       │                   ▲
         │                     │                       │                   │
         │                     └───────────────────────┘                   │
         │              la solución no se valida correctamente             │
         │                          (REAPERTURA)                           │
         │                                                                 │
         └─────────────────────────────────────────────────────────────────┘
                    cierre sin resolución (CIERRE DIRECTO):
                 duplicada · no se reproduce · no aplica
```

La base de datos restringe **qué** valores son admisibles (mediante `CHECK`),
pero no **en qué orden** pueden ocurrir. La validación de transiciones se
implementa en la capa de lógica de negocio (`backend/src/services/`), donde cada
cambio de estado deja además su registro en `HISTORIAL_INCIDENCIA`.

La tabla de transiciones vive en `backend/src/services/incidencia.service.js`
(constante `TRANSICIONES`) y es la traducción directa de este diagrama.

### Cierre directo desde ABIERTA

Una incidencia puede cerrarse sin pasar por `EN_PROGRESO` cuando no hay nada
que resolver. El caso principal lo produce el propio sistema: cuando el
detector de duplicados marca una incidencia como repetida
(`posible_duplicado_de`), obligarla a recorrer `EN_PROGRESO` y `RESUELTA`
registraría un trabajo que nunca ocurrió y distorsionaría las métricas de
tiempo de resolución.

En este camino `fecha_resolucion` permanece nula, porque no hubo resolución.
Esa nulidad es justamente lo que permite excluir estas incidencias del cálculo
de tiempo medio de resolución. Para preservar la trazabilidad, la transición
`ABIERTA → CERRADA` es la única que **exige comentario obligatorio**: el motivo
del cierre es el único dato que quedará registrado en la bitácora.

### Medición de la reapertura

El modelo no incluye un estado REABIERTA: la reapertura se deduce del historial,
como la transición `RESUELTA → EN_PROGRESO`. Consulta de referencia:

```sql
-- Tasa de reapertura de un proyecto: proporción de incidencias que
-- volvieron a EN_PROGRESO después de haber sido resueltas al menos una vez.
SELECT
    CAST(COUNT(DISTINCT h.id_incidencia) AS REAL) /
    NULLIF((SELECT COUNT(*) FROM INCIDENCIA WHERE id_proyecto = :id_proyecto), 0)
    AS tasa_reapertura
FROM HISTORIAL_INCIDENCIA h
JOIN INCIDENCIA i ON i.id_incidencia = h.id_incidencia
WHERE h.estado_anterior = 'RESUELTA'
  AND h.estado_nuevo    = 'EN_PROGRESO'
  AND i.id_proyecto     = :id_proyecto;
```

`COUNT(DISTINCT h.id_incidencia)` evita contar dos veces una incidencia que se
reabrió en más de una ocasión. `NULLIF(..., 0)` previene la división por cero
cuando el proyecto todavía no tiene incidencias.

---

## 4. Decisiones de diseño

### 4.1 Tipos de dato

SQLite no dispone de tipos `DATE` ni `BOOLEAN` nativos. Se adoptaron las
convenciones recomendadas por la documentación oficial del motor:

- **Fechas:** `TEXT` en formato ISO-8601 (`YYYY-MM-DD HH:MM:SS`, UTC). Este
  formato mantiene el orden cronológico al compararse alfabéticamente, por lo
  que `ORDER BY fecha_creacion` y los filtros por rango funcionan sin conversión.
- **Booleanos:** `INTEGER` con valores 0 y 1, acotados con `CHECK`.

### 4.2 Integridad referencial

SQLite no aplica las claves foráneas salvo que se active `PRAGMA foreign_keys = ON`
en cada conexión. El sistema lo hace al abrir la base de datos.

Las políticas de borrado se eligieron según el significado de cada relación:

| Relación | Política | Justificación |
|---|---|---|
| INCIDENCIA → PROYECTO | `ON DELETE RESTRICT` | Impide eliminar un proyecto que aún tiene incidencias registradas |
| INCIDENCIA → USUARIO (reportado_por) | `ON DELETE RESTRICT` | Preserva la trazabilidad de quién reportó cada incidencia |
| INCIDENCIA → USUARIO (asignado_a) | `ON DELETE SET NULL` | Si el responsable deja el equipo, la incidencia queda sin asignar, no se pierde |
| HISTORIAL → INCIDENCIA | `ON DELETE CASCADE` | El historial carece de sentido sin su incidencia |
| HISTORIAL → USUARIO (modificado_por) | `ON DELETE RESTRICT` | Preserva la trazabilidad: no se puede eliminar a un usuario que registró cambios |
| METRICA → PROYECTO | `ON DELETE CASCADE` | Las métricas de un proyecto eliminado dejan de ser válidas |

### 4.3 Restricciones de dominio

Todos los campos con un conjunto cerrado de valores están acotados con `CHECK`:

| Tabla.campo | Valores admitidos |
|---|---|
| USUARIO.rol | ADMINISTRADOR · DESARROLLADOR · TESTER · ANALISTA |
| PROYECTO.estado | ACTIVO · FINALIZADO · PAUSADO |
| INCIDENCIA.prioridad | ALTA · MEDIA · BAJA |
| INCIDENCIA.estado | ABIERTA · EN_PROGRESO · RESUELTA · CERRADA |
| INCIDENCIA.categoria | DISPONIBILIDAD · RENDIMIENTO · SEGURIDAD · USABILIDAD_INTERFAZ · DATOS_INTEGRIDAD · OTRO |
| INCIDENCIA.clasificacion_automatica | 0 · 1 |
| HISTORIAL_INCIDENCIA.estado_anterior / estado_nuevo | Los cuatro estados de incidencia |

Esto garantiza a nivel de motor que el sistema no pueda almacenar valores fuera
del dominio definido, incluso ante un error de programación en las capas
superiores. Adicionalmente, `INCIDENCIA` incluye una restricción que impide que
una incidencia se marque como duplicada de sí misma.

### 4.4 Índices

Se definieron índices sobre las columnas empleadas como filtro en las consultas
frecuentes: `id_proyecto`, `estado`, `categoria`, `asignado_a` y `reportado_por`
en `INCIDENCIA`; `id_incidencia` en `HISTORIAL_INCIDENCIA`; `id_proyecto` y
`tipo_metrica` en `METRICA`. Sin índice, el motor debe recorrer la tabla
completa para resolver cada filtro.

---

## 5. Verificación del modelo

El esquema fue validado ejecutándolo sobre una base SQLite real.

**Estructura**

| # | Prueba | Resultado |
|---|---|---|
| 1 | Ejecución del esquema completo | Sin errores |
| 2 | Creación de las 5 tablas y 9 índices | Correcta |
| 3 | Inserción de datos válidos en todas las tablas | Correcta |

**Restricciones de dominio** (el motor debe rechazar la operación)

| # | Prueba | Resultado |
|---|---|---|
| 4 | Rol de usuario fuera de dominio (`SUPERVISOR`) | Rechazado |
| 5 | Estado de proyecto fuera de dominio (`EN_CURSO`) | Rechazado |
| 6 | Prioridad fuera de dominio (`Urgentisima`) | Rechazado |
| 7 | Categoría fuera de dominio (`Usabilidad/Interfaz`) | Rechazado |
| 8 | Estado de incidencia fuera de dominio (`REABIERTA`) | Rechazado |
| 9 | Correo electrónico duplicado | Rechazado |
| 10 | Incidencia marcada como duplicada de sí misma | Rechazado |

**Integridad referencial**

| # | Prueba | Resultado |
|---|---|---|
| 11 | Incidencia con proyecto inexistente | Rechazado |
| 12 | Registro de historial sin `modificado_por` | Rechazado |
| 13 | Borrado de proyecto con incidencias asociadas (`RESTRICT`) | Rechazado |
| 14 | Borrado de usuario con cambios registrados (`RESTRICT`) | Rechazado |
| 15 | Borrado del usuario asignado: `asignado_a` pasa a NULL (`SET NULL`) | Correcto |
| 16 | Borrado de incidencia: su historial se elimina (`CASCADE`) | Correcto |

**Consultas de métricas sobre los datos de prueba**

| # | Prueba | Resultado |
|---|---|---|
| 17 | Antigüedad de incidencias abiertas (deuda técnica) | Correcto |
| 18 | Densidad de incidencias por categoría | Correcto |
| 19 | Tasa de reapertura por proyecto desde el historial | Correcto |
| 20 | Reconstrucción de la traza completa de una incidencia | Correcto |

---

## 6. Precisiones sobre el modelo del Capítulo IV.4

Durante la implementación se precisaron los siguientes aspectos del modelo. No
constituyen cambios de alcance: son la especificación detallada de elementos que
el capítulo enunciaba de forma general.

### 6.1 Trazabilidad del historial: campo `modificado_por`

El Capítulo IV.5 establece como requisito la **trazabilidad completa** de los
cambios de estado de una incidencia. Los campos originalmente enunciados para
`HISTORIAL_INCIDENCIA` permiten reconstruir *qué* cambió y *cuándo*, pero no
*quién* efectuó el cambio, con lo cual la trazabilidad quedaría incompleta.

Se incorpora en consecuencia el campo `modificado_por`, clave foránea hacia
`USUARIO.id_usuario`, obligatorio y con política `ON DELETE RESTRICT`. Con él,
cada registro del historial responde a las tres preguntas que exige la
trazabilidad: qué cambió, cuándo y por quién.

Ejemplo de la traza resultante para una incidencia reabierta:

| Fecha | Transición | Autor | Rol |
|---|---|---|---|
| día 0 | (nueva) → ABIERTA | Daniela Rojas | TESTER |
| día 1 | ABIERTA → EN_PROGRESO | Carolina Núñez | ADMINISTRADOR |
| día 9 | EN_PROGRESO → RESUELTA | Luis Fuentes | DESARROLLADOR |
| día 12 | RESUELTA → EN_PROGRESO | Daniela Rojas | TESTER |

### 6.2 Denominación del campo `contrasena_hash`

El campo se implementa como `contrasena_hash`, sin la letra «ñ». Se trata de una
decisión de implementación práctica: los identificadores con caracteres fuera
del rango ASCII obligan a citarlos entre comillas dobles en cada sentencia SQL
(`"contraseña_hash"`) y son una fuente frecuente de errores de codificación de
caracteres entre el editor, el motor de base de datos y las herramientas de
inspección. El significado y el propósito del campo se mantienen sin variación
respecto del Capítulo IV.4.

### 6.3 Notación de los valores de dominio

Los valores de los campos acotados se almacenan en mayúsculas y sin espacios ni
caracteres especiales (`EN_PROGRESO`, `USABILIDAD_INTERFAZ`). Esta convención
evita ambigüedades por acentuación o uso de mayúsculas al comparar valores, y
permite emplearlos directamente como parámetros en las direcciones de la API
(por ejemplo, `/api/incidencias?categoria=USABILIDAD_INTERFAZ`). La presentación
al usuario final —con acentos y formato legible— se resuelve en la capa de
presentación, no en la de persistencia.

---

## 7. Datos de prueba

El archivo `backend/src/db/seed.sql` puebla la base con un conjunto de datos
ficticios diseñado para ejercitar los tres diferenciadores del sistema:

| Contenido | Cantidad | Propósito |
|---|---|---|
| Usuarios | 5 | Cubre los cuatro roles definidos |
| Proyectos | 4 | Cubre los tres estados de proyecto |
| Incidencias | 12 | Las seis categorías y las tres prioridades |
| Registros de historial | 28 | Trazabilidad completa de cada incidencia |
| Métricas | 7 | Formato de almacenamiento del módulo de métricas |

Casos de prueba incorporados deliberadamente:

- **Detección de duplicados:** las incidencias 1 y 2 describen el mismo problema
  con redacción distinta. La 2 queda marcada con `posible_duplicado_de = 1`.
- **Tasa de reapertura:** la incidencia 8 registra la transición
  `RESUELTA → EN_PROGRESO`, lo que produce una tasa del 25 % en el proyecto 2.
- **Deuda técnica:** las incidencias abiertas tienen antigüedades entre 3 y 72
  días, de modo que el índice de salud arroje valores diferenciados por proyecto.
- **Cobertura del motor:** 8 de 12 incidencias (67 %) figuran como clasificadas
  automáticamente, permitiendo comparar clasificación automática y manual.

Las fechas se generan de forma relativa a la fecha de ejecución
(`datetime('now', '-N days')`), por lo que el conjunto conserva su
representatividad con independencia de cuándo se cargue.

Carga: `npm run db:seed` desde la carpeta `backend/`.
