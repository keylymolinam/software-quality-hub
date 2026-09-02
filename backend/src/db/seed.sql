-- =============================================================================
-- Software Quality Hub - Datos de prueba (seed)
--
-- Poblacion inicial para desarrollo y demostracion. NO son datos reales.
--
-- Los datos estan diseñados para ejercitar los tres diferenciadores:
--   * Variedad de categorias y prioridades  -> motor de clasificacion
--   * Un par de incidencias de texto similar -> detector de duplicados
--   * Antiguedades dispares y una reapertura -> indice de salud
--
-- Las fechas se generan de forma relativa (datetime('now', '-N days')) para
-- que el conjunto siga siendo representativo sin importar cuando se ejecute.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- Limpieza previa: permite volver a sembrar sin duplicar datos.
-- El orden importa: primero las tablas que dependen de otras.
DELETE FROM HISTORIAL_INCIDENCIA;
DELETE FROM METRICA;
DELETE FROM INCIDENCIA;
DELETE FROM PROYECTO;
DELETE FROM USUARIO;

-- Reinicia los contadores autoincrementales para que los IDs partan en 1.
DELETE FROM sqlite_sequence
 WHERE name IN ('USUARIO', 'PROYECTO', 'INCIDENCIA', 'HISTORIAL_INCIDENCIA', 'METRICA');


-- =============================================================================
-- USUARIO
-- Un usuario por cada rol definido en el modelo.
--
-- ATENCION: el valor de contrasena_hash es un marcador de posicion, no un hash
-- valido. Se reemplazara por hashes reales generados con bcrypt cuando se
-- implemente la autenticacion (semanas 3-5).
-- =============================================================================
INSERT INTO USUARIO (nombre, correo_electronico, contrasena_hash, rol, fecha_creacion) VALUES
    ('Carolina Nunez',  'carolina.nunez@ejemplo.cl',  'PENDIENTE_HASH_BCRYPT', 'ADMINISTRADOR', datetime('now', '-180 days')),
    ('Luis Fuentes',    'luis.fuentes@ejemplo.cl',    'PENDIENTE_HASH_BCRYPT', 'DESARROLLADOR', datetime('now', '-175 days')),
    ('Daniela Rojas',   'daniela.rojas@ejemplo.cl',   'PENDIENTE_HASH_BCRYPT', 'TESTER',        datetime('now', '-170 days')),
    ('Matias Herrera',  'matias.herrera@ejemplo.cl',  'PENDIENTE_HASH_BCRYPT', 'ANALISTA',      datetime('now', '-160 days')),
    ('Javiera Soto',    'javiera.soto@ejemplo.cl',    'PENDIENTE_HASH_BCRYPT', 'DESARROLLADOR', datetime('now', '-120 days'));


-- =============================================================================
-- PROYECTO
-- Uno por cada estado posible, para poder probar los filtros del dashboard.
-- =============================================================================
INSERT INTO PROYECTO (nombre, descripcion, fecha_inicio, estado) VALUES
    ('Portal de Autoatencion',
     'Sitio web donde los clientes consultan facturas y realizan pagos en linea.',
     date('now', '-200 days'), 'ACTIVO'),

    ('Aplicacion Movil de Terreno',
     'Aplicacion Android para el registro de visitas tecnicas en terreno.',
     date('now', '-140 days'), 'ACTIVO'),

    ('Migracion Sistema Legado',
     'Traspaso de datos historicos desde el sistema antiguo a la nueva plataforma.',
     date('now', '-300 days'), 'FINALIZADO'),

    ('Modulo de Reportes Gerenciales',
     'Tablero de indicadores para la gerencia. En espera de aprobacion presupuestaria.',
     date('now', '-60 days'), 'PAUSADO');


-- =============================================================================
-- INCIDENCIA
-- Los IDs resultantes son 1..12 en el mismo orden de insercion.
-- =============================================================================

-- --- Proyecto 1: Portal de Autoatencion --------------------------------------

-- ID 1 | Incidencia critica de disponibilidad, aun sin resolver.
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('El portal no carga para ningun usuario',
     'Al ingresar a la direccion del portal el navegador muestra un error 500. El problema afecta a todos los clientes y es urgente porque impide realizar pagos.',
     'ALTA', 'EN_PROGRESO', 'DISPONIBILIDAD',
     datetime('now', '-45 days'), NULL, 1, NULL, 1, 4, 2);

-- ID 2 | Texto deliberadamente similar al de la incidencia 1: caso de prueba
--        para el detector de duplicados (marcada como duplicada de la 1).
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('El portal no carga para los usuarios',
     'Al entrar a la direccion del portal aparece un error 500. Afecta a todos los clientes y es urgente porque no pueden realizar pagos.',
     'ALTA', 'ABIERTA', 'DISPONIBILIDAD',
     datetime('now', '-3 days'), NULL, 1, 1, 1, 3, NULL);

-- ID 3 | Incidencia antigua sin atender: aporta deuda tecnica al indice de salud.
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('La busqueda de facturas demora mas de 30 segundos',
     'Al filtrar facturas por rango de fechas la consulta tarda demasiado y en ocasiones expira. El rendimiento se degrada cuando el cliente tiene muchos documentos.',
     'ALTA', 'ABIERTA', 'RENDIMIENTO',
     datetime('now', '-72 days'), NULL, 1, NULL, 1, 3, NULL);

-- ID 4 | Incidencia de seguridad ya resuelta, pendiente de cierre.
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('Se accede al panel de administracion sin iniciar sesion',
     'Escribiendo directamente la direccion del panel de administracion se ingresa sin credenciales. Es una vulnerabilidad critica que expone datos de clientes.',
     'ALTA', 'RESUELTA', 'SEGURIDAD',
     datetime('now', '-20 days'), datetime('now', '-5 days'), 1, NULL, 1, 3, 2);

-- ID 5 | Incidencia menor ya cerrada.
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('El boton Guardar queda oculto en pantallas pequenas',
     'En resoluciones menores a 1280 pixeles el boton Guardar del formulario de perfil queda fuera del area visible y no se alcanza a presionar.',
     'BAJA', 'CERRADA', 'USABILIDAD_INTERFAZ',
     datetime('now', '-95 days'), datetime('now', '-88 days'), 0, NULL, 1, 3, 5);

-- ID 6 | Problema de datos, prioridad media.
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('Los montos se muestran sin separador de miles',
     'En el detalle de factura los valores aparecen como 1250000 en lugar de 1.250.000, lo que induce a error en la lectura de los montos.',
     'MEDIA', 'ABIERTA', 'DATOS_INTEGRIDAD',
     datetime('now', '-30 days'), NULL, 1, NULL, 1, 4, NULL);

-- ID 7 | Clasificada manualmente (clasificacion_automatica = 0).
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('Error al exportar el reporte de pagos a Excel',
     'Al presionar Exportar se descarga un archivo vacio. Ocurre solo cuando el rango seleccionado supera los tres meses.',
     'MEDIA', 'EN_PROGRESO', 'DATOS_INTEGRIDAD',
     datetime('now', '-12 days'), NULL, 0, NULL, 1, 4, 5);

-- --- Proyecto 2: Aplicacion Movil de Terreno ---------------------------------

-- ID 8 | Incidencia reabierta: la solucion no se valido correctamente.
--        Es el caso de prueba para la tasa de reapertura.
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('La aplicacion se cierra al tomar una fotografia',
     'Al capturar una fotografia durante el registro de una visita la aplicacion se cierra de forma inmediata y se pierden los datos ingresados.',
     'ALTA', 'EN_PROGRESO', 'DISPONIBILIDAD',
     datetime('now', '-18 days'), NULL, 1, NULL, 2, 3, 2);

-- ID 9
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('La sincronizacion consume demasiada bateria',
     'La sincronizacion en segundo plano mantiene el equipo activo y agota la bateria durante la jornada de terreno.',
     'MEDIA', 'ABIERTA', 'RENDIMIENTO',
     datetime('now', '-25 days'), NULL, 1, NULL, 2, 4, NULL);

-- ID 10
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('Textos cortados en la pantalla de inicio',
     'En equipos con pantalla de 5 pulgadas los titulos de las tarjetas aparecen truncados y no se alcanza a leer el nombre completo de la visita.',
     'BAJA', 'ABIERTA', 'USABILIDAD_INTERFAZ',
     datetime('now', '-15 days'), NULL, 0, NULL, 2, 3, NULL);

-- ID 11 | Solicitud que no corresponde a un defecto: categoria OTRO.
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('Solicitud de cambio de color en el logotipo',
     'Marketing solicita actualizar el color del logotipo de la aplicacion segun el nuevo manual de marca.',
     'BAJA', 'CERRADA', 'OTRO',
     datetime('now', '-70 days'), datetime('now', '-64 days'), 1, NULL, 2, 4, 5);

-- --- Proyecto 3: Migracion Sistema Legado (finalizado) -----------------------

-- ID 12
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('Migracion incompleta de historicos del ano 2019',
     'Tras la migracion faltan registros del primer trimestre de 2019 en la tabla de movimientos. Los datos existen en el sistema antiguo.',
     'ALTA', 'CERRADA', 'DATOS_INTEGRIDAD',
     datetime('now', '-130 days'), datetime('now', '-110 days'), 0, NULL, 3, 4, 2);


-- =============================================================================
-- HISTORIAL_INCIDENCIA
-- Toda incidencia registra al menos su creacion (estado_anterior = NULL).
-- =============================================================================

-- Incidencia 1: creada, tomada por un desarrollador.
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,      'ABIERTA',     datetime('now', '-45 days'), 'Incidencia registrada por el analista.',        1, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-44 days'), 'Se asigna a Luis Fuentes para diagnostico.',   1, 1);

-- Incidencia 2: solo creacion (marcada como posible duplicado por el sistema).
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-3 days'), 'Registrada por QA. El sistema la marca como posible duplicado de la incidencia 1.', 2, 3);

-- Incidencia 3: creada y sin movimiento desde hace mas de dos meses.
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-72 days'), 'Reportada durante las pruebas de carga.', 3, 3);

-- Incidencia 4: ciclo completo hasta RESUELTA.
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,          'ABIERTA',     datetime('now', '-20 days'), 'Hallazgo de la revision de seguridad.',            4, 3),
    ('ABIERTA',     'EN_PROGRESO', datetime('now', '-19 days'), 'Prioridad maxima. Se asigna de inmediato.',        4, 1),
    ('EN_PROGRESO', 'RESUELTA',    datetime('now', '-5 days'),  'Se agrego verificacion de sesion en el panel.',    4, 2);

-- Incidencia 5: ciclo completo hasta CERRADA.
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,          'ABIERTA',     datetime('now', '-95 days'), 'Reportada por el equipo de pruebas.',      5, 3),
    ('ABIERTA',     'EN_PROGRESO', datetime('now', '-93 days'), 'Se asigna a Javiera Soto.',                5, 1),
    ('EN_PROGRESO', 'RESUELTA',    datetime('now', '-88 days'), 'Se ajusto el diseno adaptable.',           5, 5),
    ('RESUELTA',    'CERRADA',     datetime('now', '-86 days'), 'Verificado en pruebas. Se cierra.',        5, 3);

-- Incidencia 6
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-30 days'), 'Detectada durante la revision funcional.', 6, 4);

-- Incidencia 7
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,      'ABIERTA',     datetime('now', '-12 days'), 'Reportada por el area comercial.', 7, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-10 days'), 'En analisis del generador de archivos.', 7, 5);

-- Incidencia 8: CASO DE REAPERTURA (RESUELTA -> EN_PROGRESO).
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,          'ABIERTA',     datetime('now', '-18 days'), 'Reportada desde terreno.',                              8, 3),
    ('ABIERTA',     'EN_PROGRESO', datetime('now', '-17 days'), 'Se asigna a Luis Fuentes.',                             8, 1),
    ('EN_PROGRESO', 'RESUELTA',    datetime('now', '-9 days'),  'Se libero la memoria de la camara al cerrar la vista.', 8, 2),
    ('RESUELTA',    'EN_PROGRESO', datetime('now', '-6 days'),  'La falla se repite en equipos Android 11. Se reabre.',  8, 3);

-- Incidencia 9
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-25 days'), 'Reportada por usuarios de terreno.', 9, 4);

-- Incidencia 10
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-15 days'), 'Detectada en pruebas de compatibilidad.', 10, 3);

-- Incidencia 11
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,          'ABIERTA',     datetime('now', '-70 days'), 'Solicitud recibida desde Marketing.', 11, 4),
    ('ABIERTA',     'EN_PROGRESO', datetime('now', '-68 days'), 'Se agenda para la siguiente version.', 11, 1),
    ('EN_PROGRESO', 'RESUELTA',    datetime('now', '-64 days'), 'Logotipo actualizado.',                11, 5),
    ('RESUELTA',    'CERRADA',     datetime('now', '-63 days'), 'Aprobado por Marketing.',              11, 4);

-- Incidencia 12
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,          'ABIERTA',     datetime('now', '-130 days'), 'Detectada en la validacion post-migracion.', 12, 4),
    ('ABIERTA',     'EN_PROGRESO', datetime('now', '-128 days'), 'Se asigna al equipo de migracion.',          12, 1),
    ('EN_PROGRESO', 'RESUELTA',    datetime('now', '-110 days'), 'Se reproceso la carga del periodo faltante.', 12, 2),
    ('RESUELTA',    'CERRADA',     datetime('now', '-108 days'), 'Conciliacion de registros conforme.',        12, 3);


-- =============================================================================
-- METRICA
-- Ejemplos del formato en que el modulo de metricas (semanas 8-9) almacenara
-- sus calculos. Los valores aqui son ilustrativos.
-- =============================================================================
INSERT INTO METRICA (tipo_metrica, valor, fecha_calculo, id_proyecto) VALUES
    ('INDICE_SALUD',            62.5,  datetime('now', '-1 days'), 1),
    ('TASA_REAPERTURA',         0.0,   datetime('now', '-1 days'), 1),
    ('ANTIGUEDAD_MEDIA_DIAS',   41.2,  datetime('now', '-1 days'), 1),
    ('INDICE_SALUD',            74.0,  datetime('now', '-1 days'), 2),
    ('TASA_REAPERTURA',         0.25,  datetime('now', '-1 days'), 2),
    ('ANTIGUEDAD_MEDIA_DIAS',   19.5,  datetime('now', '-1 days'), 2),
    ('INDICE_SALUD_GLOBAL',     68.3,  datetime('now', '-1 days'), NULL);
