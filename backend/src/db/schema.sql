-- =============================================================================
-- Software Quality Hub - Esquema de base de datos (SQLite)
-- Modelo de datos segun Capitulo IV.4 y IV.5 de la memoria de titulo.
--
-- Convenciones:
--   * Los nombres de tabla van en MAYUSCULAS, igual que en el documento.
--   * Las fechas se guardan como TEXT en formato ISO-8601 ('YYYY-MM-DD HH:MM:SS').
--     SQLite no tiene un tipo DATE propio; este formato se ordena y compara
--     correctamente de forma alfabetica, que es justo lo que se necesita.
--   * Los booleanos se guardan como INTEGER 0 (falso) / 1 (verdadero),
--     restringidos con CHECK. SQLite tampoco tiene tipo BOOLEAN.
--   * datetime('now') devuelve la fecha y hora actual en UTC.
-- =============================================================================

-- SQLite NO aplica las claves foraneas por defecto: hay que activarlas
-- en cada conexion. Se repite tambien desde el codigo (database.js).
PRAGMA foreign_keys = ON;


-- =============================================================================
-- USUARIO
-- Personas que usan el sistema: reportan incidencias o son asignadas a ellas.
-- =============================================================================
CREATE TABLE IF NOT EXISTS USUARIO (
    id_usuario          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre              TEXT    NOT NULL,
    correo_electronico  TEXT    NOT NULL UNIQUE,

    -- Nombre sin "ñ" por decision de implementacion: evita tener que citar el
    -- identificador con comillas dobles en cada consulta y descarta problemas
    -- de codificacion de caracteres entre herramientas.
    contrasena_hash     TEXT    NOT NULL,

    rol                 TEXT    NOT NULL
        CHECK (rol IN ('ADMINISTRADOR', 'DESARROLLADOR', 'TESTER', 'ANALISTA')),

    fecha_creacion      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- UNIQUE en correo_electronico impide registrar dos cuentas con el mismo
-- correo. Es la base para el inicio de sesion.

-- Nunca se almacena la contraseña en texto plano, solo su hash (huella
-- irreversible generada con bcrypt). Si la base de datos se filtrara, las
-- contraseñas seguirian siendo ilegibles.


-- =============================================================================
-- PROYECTO
-- Agrupa incidencias. Un proyecto tiene muchas incidencias.
-- =============================================================================
CREATE TABLE IF NOT EXISTS PROYECTO (
    id_proyecto     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT    NOT NULL,
    descripcion     TEXT,
    fecha_inicio    TEXT,
    estado          TEXT    NOT NULL
        CHECK (estado IN ('ACTIVO', 'FINALIZADO', 'PAUSADO'))
);


-- =============================================================================
-- INCIDENCIA
-- Entidad central del sistema.
--
-- Flujo de estados (Cap. IV.5):
--     ABIERTA -> EN_PROGRESO -> RESUELTA -> CERRADA
--        |             ^              |         ^
--        |             +--------------+         |
--        |    (la solucion no se valida bien)   |
--        +-------------------------------------+
--          (cierre sin resolucion: duplicada,
--           no se reproduce, no aplica)
--
-- La validez de cada transicion se controla en la capa de logica de negocio
-- (services/), no en la base de datos: SQL puede restringir QUE valores son
-- admisibles, pero no en QUE orden pueden ocurrir.
-- =============================================================================
CREATE TABLE IF NOT EXISTS INCIDENCIA (
    id_incidencia               INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo                      TEXT    NOT NULL,
    descripcion                 TEXT    NOT NULL,

    prioridad                   TEXT    NOT NULL
        CHECK (prioridad IN ('ALTA', 'MEDIA', 'BAJA')),

    estado                      TEXT    NOT NULL DEFAULT 'ABIERTA'
        CHECK (estado IN ('ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'CERRADA')),

    categoria                   TEXT    NOT NULL
        CHECK (categoria IN (
            'DISPONIBILIDAD',
            'RENDIMIENTO',
            'SEGURIDAD',
            'USABILIDAD_INTERFAZ',
            'DATOS_INTEGRIDAD',
            'OTRO'
        )),

    fecha_creacion              TEXT    NOT NULL DEFAULT (datetime('now')),
    fecha_resolucion            TEXT,   -- NULL mientras no se resuelve

    -- --- Campos de los diferenciadores del proyecto --------------------------

    -- 1 = categoria y prioridad las asigno el motor de reglas lexicas
    -- 0 = las asigno una persona
    clasificacion_automatica    INTEGER NOT NULL DEFAULT 0
        CHECK (clasificacion_automatica IN (0, 1)),

    -- Incidencia con la que el detector de duplicados encontro similitud
    -- por sobre el umbral. NULL = no se detecto duplicado.
    posible_duplicado_de        INTEGER,

    -- --- Claves foraneas -----------------------------------------------------
    id_proyecto                 INTEGER NOT NULL,
    reportado_por               INTEGER NOT NULL,
    asignado_a                  INTEGER,    -- NULL = sin asignar

    FOREIGN KEY (id_proyecto)          REFERENCES PROYECTO (id_proyecto)
        ON DELETE RESTRICT,
    FOREIGN KEY (reportado_por)        REFERENCES USUARIO (id_usuario)
        ON DELETE RESTRICT,
    FOREIGN KEY (asignado_a)           REFERENCES USUARIO (id_usuario)
        ON DELETE SET NULL,
    FOREIGN KEY (posible_duplicado_de) REFERENCES INCIDENCIA (id_incidencia)
        ON DELETE SET NULL,

    -- Una incidencia no puede ser duplicada de si misma.
    CHECK (posible_duplicado_de IS NULL OR posible_duplicado_de <> id_incidencia)
);

-- Indices: aceleran las consultas que filtran por estas columnas.
-- Sin ellos, SQLite recorre la tabla completa fila por fila.
CREATE INDEX IF NOT EXISTS idx_incidencia_proyecto  ON INCIDENCIA (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_incidencia_estado    ON INCIDENCIA (estado);
CREATE INDEX IF NOT EXISTS idx_incidencia_categoria ON INCIDENCIA (categoria);
CREATE INDEX IF NOT EXISTS idx_incidencia_asignado  ON INCIDENCIA (asignado_a);
CREATE INDEX IF NOT EXISTS idx_incidencia_reportado ON INCIDENCIA (reportado_por);


-- =============================================================================
-- HISTORIAL_INCIDENCIA
-- Registro de cada cambio de estado. Es la fuente de datos para calcular la
-- tasa de reapertura del indice de salud: una reapertura es un registro con
-- estado_anterior = 'RESUELTA' y estado_nuevo = 'EN_PROGRESO'.
-- =============================================================================
CREATE TABLE IF NOT EXISTS HISTORIAL_INCIDENCIA (
    id_historial     INTEGER PRIMARY KEY AUTOINCREMENT,

    -- NULL solo en el primer registro (creacion de la incidencia).
    estado_anterior  TEXT
        CHECK (estado_anterior IS NULL OR estado_anterior IN
            ('ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'CERRADA')),

    estado_nuevo     TEXT    NOT NULL
        CHECK (estado_nuevo IN
            ('ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'CERRADA')),

    fecha_cambio     TEXT    NOT NULL DEFAULT (datetime('now')),
    comentario       TEXT,

    id_incidencia    INTEGER NOT NULL,

    -- Usuario que efectuo el cambio. Obligatorio: sin este dato la
    -- trazabilidad exigida en el Cap. IV.5 quedaria incompleta.
    modificado_por   INTEGER NOT NULL,

    FOREIGN KEY (id_incidencia) REFERENCES INCIDENCIA (id_incidencia)
        ON DELETE CASCADE,
    FOREIGN KEY (modificado_por) REFERENCES USUARIO (id_usuario)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_historial_incidencia
    ON HISTORIAL_INCIDENCIA (id_incidencia);
CREATE INDEX IF NOT EXISTS idx_historial_usuario
    ON HISTORIAL_INCIDENCIA (modificado_por);


-- =============================================================================
-- METRICA
-- Valores calculados y almacenados para el dashboard (semanas 8-9).
-- id_proyecto NULL significa que la metrica es global del sistema.
-- =============================================================================
CREATE TABLE IF NOT EXISTS METRICA (
    id_metrica     INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_metrica   TEXT    NOT NULL,
    valor          REAL    NOT NULL,
    fecha_calculo  TEXT    NOT NULL DEFAULT (datetime('now')),

    id_proyecto    INTEGER,    -- NULL = metrica global

    FOREIGN KEY (id_proyecto) REFERENCES PROYECTO (id_proyecto)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metrica_proyecto ON METRICA (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_metrica_tipo     ON METRICA (tipo_metrica);
