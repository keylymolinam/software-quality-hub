# Diagrama entidad-relación

Figura del modelo de datos. Las cinco entidades, sus atributos y las relaciones
entre ellas, tal como están declaradas en `backend/src/db/schema.sql`.

```mermaid
erDiagram
    USUARIO ||--o{ INCIDENCIA : "reporta"
    USUARIO |o--o{ INCIDENCIA : "tiene asignada"
    USUARIO ||--o{ HISTORIAL_INCIDENCIA : "registra el cambio"
    PROYECTO ||--o{ INCIDENCIA : "agrupa"
    PROYECTO |o--o{ METRICA : "se mide"
    INCIDENCIA ||--o{ HISTORIAL_INCIDENCIA : "deja constancia en"
    INCIDENCIA |o--o{ INCIDENCIA : "posible duplicado de"

    USUARIO {
        INTEGER id_usuario PK
        TEXT nombre
        TEXT correo_electronico UK
        TEXT contrasena_hash
        TEXT rol "ADMINISTRADOR, DESARROLLADOR, TESTER o ANALISTA"
        TEXT fecha_creacion
    }

    PROYECTO {
        INTEGER id_proyecto PK
        TEXT nombre
        TEXT descripcion "opcional"
        TEXT fecha_inicio "opcional"
        TEXT estado "ACTIVO, FINALIZADO o PAUSADO"
    }

    INCIDENCIA {
        INTEGER id_incidencia PK
        TEXT titulo
        TEXT descripcion
        TEXT prioridad "ALTA, MEDIA o BAJA"
        TEXT estado "ABIERTA, EN_PROGRESO, RESUELTA o CERRADA"
        TEXT categoria "6 valores admitidos"
        TEXT fecha_creacion
        TEXT fecha_resolucion "nula mientras no se resuelve"
        INTEGER clasificacion_automatica "0 o 1"
        INTEGER posible_duplicado_de FK "nula si no hay parecido"
        INTEGER id_proyecto FK
        INTEGER reportado_por FK
        INTEGER asignado_a FK "nula si nadie la tiene"
    }

    HISTORIAL_INCIDENCIA {
        INTEGER id_historial PK
        TEXT estado_anterior "nulo solo en el registro de creación"
        TEXT estado_nuevo
        TEXT fecha_cambio
        TEXT comentario "opcional, salvo en el cierre sin resolver"
        INTEGER id_incidencia FK
        INTEGER modificado_por FK
    }

    METRICA {
        INTEGER id_metrica PK
        TEXT tipo_metrica
        REAL valor
        TEXT fecha_calculo
        INTEGER id_proyecto FK "nula = métrica global"
    }
```

## Lo que el diagrama no puede mostrar

Las cardinalidades dicen cuántos registros se relacionan, pero no qué ocurre al
borrar uno. Esa decisión está en cada clave foránea y es la que protege la
trazabilidad:

| Relación | Al borrar el padre | Por qué |
|---|---|---|
| `INCIDENCIA.id_proyecto` | `RESTRICT` | Un proyecto con incidencias no se borra: se perdería el trabajo registrado |
| `INCIDENCIA.reportado_por` | `RESTRICT` | Quien reportó es un dato histórico; borrarlo dejaría incidencias sin autor |
| `INCIDENCIA.asignado_a` | `SET NULL` | Que alguien deje el equipo no destruye la incidencia: queda sin asignar |
| `INCIDENCIA.posible_duplicado_de` | `SET NULL` | Si la original desaparece, el aviso deja de tener sentido, pero el duplicado sigue siendo una incidencia válida |
| `HISTORIAL_INCIDENCIA.id_incidencia` | `CASCADE` | La bitácora no tiene vida propia: sin su incidencia no significa nada |
| `HISTORIAL_INCIDENCIA.modificado_por` | `RESTRICT` | Un cambio sin responsable rompe la trazabilidad, que es la base del índice de salud |
| `METRICA.id_proyecto` | `CASCADE` | Una métrica es un valor calculado; se recalcula, no se conserva |

Dos restricciones más que tampoco se ven en la figura:

- `correo_electronico` es `UNIQUE`: impide dos cuentas con el mismo correo.
- `posible_duplicado_de <> id_incidencia`: una incidencia no puede ser duplicada
  de sí misma. Es un `CHECK`, porque el error es imposible de cometer a mano pero
  trivial de cometer con un bucle.

## Mantenimiento

Esta figura **repite** lo que declara `schema.sql`. Si se agrega una columna o se
cambia una clave foránea, hay que editar los dos lugares: el esquema es la verdad
y el diagrama es la explicación. El diccionario de datos completo, con tipos y
justificaciones, está en [`../modelo-datos.md`](../modelo-datos.md).
