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
-- El historial sigue el ciclo de vida del defecto: lo resuelto pasa por
-- VALIDADA (QA lo prueba) antes de cerrarse. La incidencia 4 queda RESUELTA,
-- esperando validacion, y la 11 VALIDADA, esperando el cierre: asi la
-- demostracion tiene un caso en cada paso del final del flujo.
--
-- Las fechas se generan de forma relativa (datetime('now', '-N days')) para
-- que el conjunto siga siendo representativo sin importar cuando se ejecute.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- Las tablas llegan recien creadas y vacias: seed.js llama a recrearEsquema()
-- antes de ejecutar este archivo, y por eso los IDs parten en 1.


-- =============================================================================
-- USUARIO
-- Un usuario por cada rol definido en el modelo.
--
-- Los nombres y correos dicen el rol (superusuario@, tester@...) en vez de ser
-- nombres de personas: en una demostracion se sabe de inmediato con que perfil
-- entrar, y nadie los confunde con datos de personas reales.
--
-- Todos los usuarios de prueba comparten la contrasena:  Demo1234
--
-- El valor guardado NO es esa contrasena, sino su hash bcrypt. bcrypt es una
-- funcion de un solo sentido: de la contrasena se obtiene el hash, pero del
-- hash no se puede volver a la contrasena. Al iniciar sesion no se compara
-- texto con texto, se vuelve a calcular el hash de lo escrito y se comparan
-- los hashes.
--
-- Las cinco filas repiten el mismo hash solo porque comparten la contrasena de
-- demostracion. En uso real cada persona elige la suya, y bcrypt genera una
-- "sal" distinta en cada llamada, de modo que dos personas con la misma
-- contrasena tendrian hashes diferentes.
--
-- Para regenerarlo con otra contrasena:
--   node -e "console.log(require('bcryptjs').hashSync('TuClave', 10))"
-- =============================================================================
INSERT INTO USUARIO (nombre, correo_electronico, contrasena_hash, rol, fecha_creacion) VALUES
    ('Superusuario',    'superusuario@ejemplo.cl',    '$2b$10$RxWpNHJ5BOQneWPzw0Pq.ele/pDtGgM0gHJWEG2/joOI40Q3HR722', 'ADMINISTRADOR', datetime('now', '-180 days')),
    ('Desarrollador 1', 'desarrollador1@ejemplo.cl',  '$2b$10$RxWpNHJ5BOQneWPzw0Pq.ele/pDtGgM0gHJWEG2/joOI40Q3HR722', 'DESARROLLADOR', datetime('now', '-175 days')),
    ('Tester',          'tester@ejemplo.cl',          '$2b$10$RxWpNHJ5BOQneWPzw0Pq.ele/pDtGgM0gHJWEG2/joOI40Q3HR722', 'TESTER',        datetime('now', '-170 days')),
    ('Analista',        'analista@ejemplo.cl',        '$2b$10$RxWpNHJ5BOQneWPzw0Pq.ele/pDtGgM0gHJWEG2/joOI40Q3HR722', 'ANALISTA',      datetime('now', '-160 days')),
    ('Desarrollador 2', 'desarrollador2@ejemplo.cl',  '$2b$10$RxWpNHJ5BOQneWPzw0Pq.ele/pDtGgM0gHJWEG2/joOI40Q3HR722', 'DESARROLLADOR', datetime('now', '-120 days'));


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
-- Los IDs resultantes son 1..12 en el mismo orden de insercion. Las 13 a 40
-- estan mas abajo, en la ampliacion para la demostracion.
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
--         Validada por QA y a la espera de que Marketing apruebe el cierre.
INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    ('Solicitud de cambio de color en el logotipo',
     'Marketing solicita actualizar el color del logotipo de la aplicacion segun el nuevo manual de marca.',
     'BAJA', 'VALIDADA', 'OTRO',
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
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-44 days'), 'Se asigna a Desarrollador 1 para diagnostico.',   1, 1);

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

-- Incidencia 5: ciclo completo hasta CERRADA, pasando por la validacion de QA.
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,          'ABIERTA',     datetime('now', '-95 days'), 'Reportada por el equipo de pruebas.',      5, 3),
    ('ABIERTA',     'EN_PROGRESO', datetime('now', '-93 days'), 'Se asigna a Desarrollador 2.',                5, 1),
    ('EN_PROGRESO', 'RESUELTA',    datetime('now', '-88 days'), 'Se ajusto el diseno adaptable.',           5, 5),
    ('RESUELTA',    'VALIDADA',    datetime('now', '-87 days'), 'Verificado en pruebas por QA.',            5, 3),
    ('VALIDADA',    'CERRADA',     datetime('now', '-86 days'), 'Se cierra.',                               5, 3);

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
    ('ABIERTA',     'EN_PROGRESO', datetime('now', '-17 days'), 'Se asigna a Desarrollador 1.',                             8, 1),
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
    ('RESUELTA',    'VALIDADA',    datetime('now', '-63 days'), 'QA confirma el color en todas las pantallas.', 11, 3);

-- Incidencia 12
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL,          'ABIERTA',     datetime('now', '-130 days'), 'Detectada en la validacion post-migracion.', 12, 4),
    ('ABIERTA',     'EN_PROGRESO', datetime('now', '-128 days'), 'Se asigna al equipo de migracion.',          12, 1),
    ('EN_PROGRESO', 'RESUELTA',    datetime('now', '-110 days'), 'Se reproceso la carga del periodo faltante.', 12, 2),
    ('RESUELTA',    'VALIDADA',    datetime('now', '-109 days'), 'Conciliacion de registros conforme.',        12, 3),
    ('VALIDADA',    'CERRADA',     datetime('now', '-108 days'), 'Se cierra tras la validacion.',              12, 3);


-- =============================================================================
-- AMPLIACION PARA LA DEMOSTRACION (IDs 13 a 40)
--
-- Datos ficticios, agregados para que la demostracion tenga volumen y para que
-- cada proyecto cuente una historia distinta en el indice de salud:
--
--   Portal de Autoatencion     varias reaperturas            -> ATENCION
--   Aplicacion Movil           abiertas antiguas, reaperturas -> CRITICO
--   Migracion Sistema Legado   casi todo cerrado a tiempo     -> SALUDABLE
--   Reportes Gerenciales       sin incidencias (pausado)      -> SIN DATOS
--
-- NO son evidencia de nada: la precision del clasificador se mide con el
-- conjunto etiquetado de backend/evaluacion/, no con estos datos. Las parejas
-- de posibles duplicados se marcan a mano, igual que la 1 y la 2 de arriba.
--
-- El historial de cada una sigue la maquina de estados (TRANSICIONES), y
-- fecha_resolucion sigue al estado como lo hace el service: la fecha del
-- ultimo paso a RESUELTA, nula si se reabrio despues o si se cerro sin resolver.
-- =============================================================================

-- --- Proyecto 1: Portal de Autoatencion (historia: reaperturas -> ATENCION) ----

INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    -- ID 13 | reabierta una vez y luego cerrada
    ('El comprobante de pago llega sin el numero de transaccion',
     'El correo de confirmacion del pago no incluye el numero de transaccion, y el cliente no puede respaldar el pago ante su banco.',
     'MEDIA', 'CERRADA', 'DATOS_INTEGRIDAD',
     datetime('now', '-60 days'), datetime('now', '-40 days'), 1, NULL, 1, 4, 2),

    -- ID 14 | reabierta, sigue en desarrollo
    ('La sesion expira mientras el cliente completa el pago',
     'Si el cliente tarda mas de cinco minutos en el formulario de pago, la sesion expira y al confirmar pierde los datos ingresados.',
     'ALTA', 'EN_PROGRESO', 'SEGURIDAD',
     datetime('now', '-35 days'), NULL, 1, NULL, 1, 3, 5),

    -- ID 15
    ('El correo de recuperacion de clave no llega a cuentas Outlook',
     'Los clientes con correo Outlook o Hotmail no reciben el mensaje para recuperar su clave; con Gmail llega sin problemas.',
     'MEDIA', 'EN_PROGRESO', 'DISPONIBILIDAD',
     datetime('now', '-22 days'), NULL, 1, NULL, 1, 4, 2),

    -- ID 16
    ('Los filtros de facturas se borran al volver atras',
     'Despues de abrir una factura y volver al listado, los filtros elegidos desaparecen y hay que configurarlos de nuevo.',
     'BAJA', 'ABIERTA', 'USABILIDAD_INTERFAZ',
     datetime('now', '-9 days'), NULL, 1, NULL, 1, 3, NULL),

    -- ID 17
    ('El pago con tarjeta queda pendiente sin confirmacion',
     'Algunos pagos con tarjeta quedan en estado pendiente aunque el banco ya los aprobo, y el cliente vuelve a pagar.',
     'ALTA', 'CERRADA', 'DATOS_INTEGRIDAD',
     datetime('now', '-80 days'), datetime('now', '-70 days'), 0, NULL, 1, 4, 2),

    -- ID 18 | reabierta una vez y luego cerrada
    ('El grafico de consumo no muestra el mes actual',
     'El grafico de consumo historico termina en el mes anterior; el mes en curso no aparece hasta que termina.',
     'BAJA', 'CERRADA', 'DATOS_INTEGRIDAD',
     datetime('now', '-110 days'), datetime('now', '-90 days'), 1, NULL, 1, 3, 5),

    -- ID 19
    ('La pagina de inicio tarda en cargar en horario punta',
     'Entre las 9 y las 11 de la manana la pagina de inicio demora mas de diez segundos en mostrarse.',
     'MEDIA', 'EN_PROGRESO', 'RENDIMIENTO',
     datetime('now', '-6 days'), NULL, 1, NULL, 1, 4, 5),

    -- ID 20
    ('Error 500 al descargar la factura en PDF',
     'Al presionar Descargar PDF en el detalle de una factura aparece un error 500 y el archivo no se genera.',
     'MEDIA', 'EN_PROGRESO', 'DISPONIBILIDAD',
     datetime('now', '-14 days'), NULL, 1, NULL, 1, 4, 2),

    -- ID 21 | posible duplicado
    ('Al descargar la factura en PDF aparece error 500',
     'Cuando se descarga una factura en PDF desde el detalle aparece un error 500 y no se genera el archivo.',
     'MEDIA', 'ABIERTA', 'DISPONIBILIDAD',
     datetime('now', '-2 days'), NULL, 1, 20, 1, 3, NULL),

    -- ID 22
    ('Se rechaza el RUT con digito verificador K',
     'El formulario de registro rechaza los RUT que terminan en K aunque sean validos.',
     'MEDIA', 'CERRADA', 'DATOS_INTEGRIDAD',
     datetime('now', '-40 days'), datetime('now', '-33 days'), 0, NULL, 1, 3, 2),

    -- ID 23 | rechazada: no es un defecto
    ('Solicitud de agregar modo oscuro al portal',
     'Un cliente solicita que el portal tenga un modo oscuro para usarlo de noche.',
     'BAJA', 'CERRADA', 'OTRO',
     datetime('now', '-26 days'), NULL, 1, NULL, 1, 4, NULL);

-- --- Proyecto 2: Aplicacion Movil de Terreno (historia: abiertas antiguas y reaperturas -> CRITICO) ---

INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    -- ID 24
    ('El GPS registra la visita en una ubicacion equivocada',
     'La ubicacion guardada con la visita queda a varios kilometros del lugar real cuando el equipo tiene poca senal.',
     'ALTA', 'EN_PROGRESO', 'DATOS_INTEGRIDAD',
     datetime('now', '-120 days'), NULL, 1, NULL, 2, 3, 2),

    -- ID 25 | reabierta, sigue en desarrollo
    ('La aplicacion se congela al sincronizar sin senal',
     'Si se inicia la sincronizacion sin cobertura la aplicacion queda congelada y hay que forzar el cierre.',
     'ALTA', 'EN_PROGRESO', 'DISPONIBILIDAD',
     datetime('now', '-105 days'), NULL, 1, NULL, 2, 3, 5),

    -- ID 26
    ('Las visitas guardadas sin conexion se pierden al reiniciar',
     'Las visitas registradas sin conexion desaparecen si el equipo se reinicia antes de sincronizar.',
     'ALTA', 'ABIERTA', 'DISPONIBILIDAD',
     datetime('now', '-98 days'), NULL, 1, NULL, 2, 4, NULL),

    -- ID 27 | reabierta, resuelta otra vez y esperando QA
    ('La firma del cliente se guarda en blanco',
     'En algunas visitas la firma del cliente queda guardada como una imagen en blanco y el informe no tiene validez.',
     'ALTA', 'RESUELTA', 'DATOS_INTEGRIDAD',
     datetime('now', '-88 days'), datetime('now', '-60 days'), 1, NULL, 2, 3, 2),

    -- ID 28
    ('La aplicacion se cierra al abrir el mapa de rutas',
     'Al abrir el mapa con las rutas del dia la aplicacion se cierra sin mostrar ningun mensaje.',
     'ALTA', 'EN_PROGRESO', 'DISPONIBILIDAD',
     datetime('now', '-75 days'), NULL, 1, NULL, 2, 3, 5),

    -- ID 29 | posible duplicado de la 8
    ('La aplicacion se cierra al sacar una foto',
     'Al sacar una fotografia en el registro de la visita la aplicacion se cierra y se pierden los datos ingresados.',
     'ALTA', 'ABIERTA', 'DISPONIBILIDAD',
     datetime('now', '-5 days'), NULL, 1, 8, 2, 4, NULL),

    -- ID 30
    ('El listado de visitas tarda en cargar',
     'Con mas de cien visitas asignadas el listado tarda casi un minuto en aparecer.',
     'MEDIA', 'ABIERTA', 'RENDIMIENTO',
     datetime('now', '-64 days'), NULL, 1, NULL, 2, 3, NULL),

    -- ID 31 | reabierta una vez y luego cerrada
    ('Las notificaciones de nuevas visitas llegan con horas de retraso',
     'El aviso de una visita nueva llega al tecnico varias horas despues de asignada.',
     'MEDIA', 'CERRADA', 'DISPONIBILIDAD',
     datetime('now', '-50 days'), datetime('now', '-30 days'), 1, NULL, 2, 4, 5),

    -- ID 32
    ('El boton de enviar informe no responde en Android 10',
     'En equipos con Android 10 el boton Enviar informe no hace nada al presionarlo.',
     'ALTA', 'EN_PROGRESO', 'DISPONIBILIDAD',
     datetime('now', '-56 days'), NULL, 0, NULL, 2, 3, 2);

-- --- Proyecto 3: Migracion Sistema Legado (historia: todo resuelto a tiempo -> SALUDABLE) ---

INSERT INTO INCIDENCIA
    (titulo, descripcion, prioridad, estado, categoria, fecha_creacion,
     fecha_resolucion, clasificacion_automatica, posible_duplicado_de,
     id_proyecto, reportado_por, asignado_a)
VALUES
    -- ID 33
    ('Clientes duplicados tras la carga inicial',
     'Despues de la primera carga aparecen clientes repetidos con el mismo RUT y distinto codigo interno.',
     'ALTA', 'CERRADA', 'DATOS_INTEGRIDAD',
     datetime('now', '-280 days'), datetime('now', '-270 days'), 1, NULL, 3, 4, 2),

    -- ID 34
    ('La carga nocturna excede la ventana de mantencion',
     'El proceso de carga nocturno termina despues de las 7 de la manana y bloquea el inicio de la jornada.',
     'MEDIA', 'CERRADA', 'RENDIMIENTO',
     datetime('now', '-250 days'), datetime('now', '-240 days'), 1, NULL, 3, 4, 5),

    -- ID 35
    ('Usuarios migrados sin permisos de consulta',
     'Los usuarios traidos del sistema antiguo no tienen permisos para consultar sus propios registros.',
     'ALTA', 'CERRADA', 'SEGURIDAD',
     datetime('now', '-220 days'), datetime('now', '-215 days'), 1, NULL, 3, 3, 2),

    -- ID 36
    ('Las fechas del sistema antiguo quedan desfasadas un dia',
     'Las fechas migradas aparecen un dia antes que en el sistema de origen por una diferencia de zona horaria.',
     'MEDIA', 'CERRADA', 'DATOS_INTEGRIDAD',
     datetime('now', '-190 days'), datetime('now', '-182 days'), 0, NULL, 3, 4, 5),

    -- ID 37
    ('Caracteres especiales aparecen como signos de interrogacion',
     'Los nombres con tildes o con la letra ene se ven como signos de interrogacion despues de migrar.',
     'BAJA', 'CERRADA', 'DATOS_INTEGRIDAD',
     datetime('now', '-160 days'), datetime('now', '-150 days'), 1, NULL, 3, 3, 2),

    -- ID 38
    ('El informe de conciliacion no cuadra en los totales',
     'El total de movimientos del informe de conciliacion difiere en tres registros del sistema de origen.',
     'MEDIA', 'EN_PROGRESO', 'DATOS_INTEGRIDAD',
     datetime('now', '-8 days'), NULL, 1, NULL, 3, 4, 2),

    -- ID 39
    ('Falta el manual de la nueva plataforma para soporte',
     'El equipo de soporte solicita el manual de uso de la nueva plataforma para atender consultas.',
     'BAJA', 'ABIERTA', 'OTRO',
     datetime('now', '-4 days'), NULL, 1, NULL, 3, 4, NULL),

    -- ID 40
    ('La consulta historica no tiene paginacion',
     'La pantalla de consulta historica muestra todos los registros en una sola pagina y es dificil de recorrer.',
     'BAJA', 'EN_PROGRESO', 'USABILIDAD_INTERFAZ',
     datetime('now', '-3 days'), NULL, 1, NULL, 3, 3, 5);

-- Incidencia 13
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-60 days'), 'Reclamo recibido por la mesa de ayuda.', 13, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-58 days'), 'Se revisa la plantilla del correo.', 13, 2),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-50 days'), 'Se agrega el numero de transaccion a la plantilla.', 13, 2),
    ('RESUELTA', 'EN_PROGRESO', datetime('now', '-47 days'), 'En pagos con transferencia el numero sigue sin aparecer. Se reabre.', 13, 3),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-40 days'), 'Se cubre tambien el pago por transferencia.', 13, 2),
    ('RESUELTA', 'VALIDADA', datetime('now', '-39 days'), 'QA lo verifica con los tres medios de pago.', 13, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-38 days'), 'Se cierra.', 13, 3);

-- Incidencia 14
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-35 days'), 'Detectada en pruebas de regresion.', 14, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-34 days'), 'Se toma para revisar el tiempo de sesion.', 14, 5),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-28 days'), 'Se renueva la sesion mientras el formulario esta activo.', 14, 5),
    ('RESUELTA', 'EN_PROGRESO', datetime('now', '-25 days'), 'Con el pago en cuotas la sesion sigue expirando. Se reabre.', 14, 3);

-- Incidencia 15
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-22 days'), 'Varios reclamos de clientes en la mesa de ayuda.', 15, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-21 days'), 'Se revisa la configuracion del servidor de correo.', 15, 2);

-- Incidencia 16
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-9 days'), 'Observado durante la prueba de usabilidad.', 16, 3);

-- Incidencia 17
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-80 days'), 'Reportado por el area de finanzas.', 17, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-79 days'), 'Se revisa la respuesta del banco.', 17, 2),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-70 days'), 'Se corrige la lectura de la confirmacion del banco.', 17, 2),
    ('RESUELTA', 'VALIDADA', datetime('now', '-69 days'), 'QA confirma con pagos de prueba.', 17, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-68 days'), 'Se cierra.', 17, 3);

-- Incidencia 18
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-110 days'), 'Detectada en la revision funcional.', 18, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-108 days'), 'Se revisa la consulta del grafico.', 18, 5),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-100 days'), 'Se incluye el mes en curso.', 18, 5),
    ('RESUELTA', 'EN_PROGRESO', datetime('now', '-96 days'), 'El primer dia del mes el grafico queda vacio. Se reabre.', 18, 3),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-90 days'), 'Se corrige el caso del primer dia.', 18, 5),
    ('RESUELTA', 'VALIDADA', datetime('now', '-89 days'), 'Verificado por QA.', 18, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-88 days'), 'Se cierra.', 18, 3);

-- Incidencia 19
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-6 days'), 'Reportada por el monitoreo.', 19, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-4 days'), 'Se analiza la carga del servidor.', 19, 5);

-- Incidencia 20
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-14 days'), 'Reportada por la mesa de ayuda.', 20, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-13 days'), 'Se revisa el generador de PDF.', 20, 2);

-- Incidencia 21
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-2 days'), 'Registrada por QA. El sistema la marca como posible duplicado.', 21, 3);

-- Incidencia 22
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-40 days'), 'Detectada en pruebas de registro.', 22, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-39 days'), 'Se revisa la validacion del RUT.', 22, 2),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-33 days'), 'Se acepta la K mayuscula y minuscula.', 22, 2),
    ('RESUELTA', 'VALIDADA', datetime('now', '-32 days'), 'QA lo prueba con varios RUT.', 22, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-31 days'), 'Se cierra.', 22, 3);

-- Incidencia 23
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-26 days'), 'Solicitud recibida por la mesa de ayuda.', 23, 4),
    ('ABIERTA', 'CERRADA', datetime('now', '-24 days'), 'No es un defecto: se registra como mejora para una version futura.', 23, 1);

-- Incidencia 24
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-120 days'), 'Reportada desde terreno.', 24, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-118 days'), 'En analisis; depende del proveedor del mapa.', 24, 2);

-- Incidencia 25
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-105 days'), 'Reportada desde terreno.', 25, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-104 days'), 'Se toma para diagnostico.', 25, 5),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-95 days'), 'Se agrega un tiempo maximo de espera.', 25, 5),
    ('RESUELTA', 'EN_PROGRESO', datetime('now', '-92 days'), 'En zonas rurales se sigue congelando. Se reabre.', 25, 3);

-- Incidencia 26
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-98 days'), 'Reclamo de los supervisores de terreno.', 26, 4);

-- Incidencia 27
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-88 days'), 'Detectada al revisar informes.', 27, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-87 days'), 'Se revisa el componente de firma.', 27, 2),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-80 days'), 'Se corrige el guardado de la imagen.', 27, 2),
    ('RESUELTA', 'EN_PROGRESO', datetime('now', '-76 days'), 'En tabletas sigue quedando en blanco. Se reabre.', 27, 3),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-60 days'), 'Se ajusta la resolucion para tabletas.', 27, 2);

-- Incidencia 28
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-75 days'), 'Reportada desde terreno.', 28, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-74 days'), 'Se revisa el consumo de memoria del mapa.', 28, 5);

-- Incidencia 29
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-5 days'), 'Registrada por el analista. El sistema la marca como posible duplicado de la incidencia 8.', 29, 4);

-- Incidencia 30
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-64 days'), 'Detectada en pruebas de carga.', 30, 3);

-- Incidencia 31
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-50 days'), 'Reclamo de coordinacion.', 31, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-49 days'), 'Se revisa el servicio de notificaciones.', 31, 5),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-44 days'), 'Se cambia el proveedor de notificaciones.', 31, 5),
    ('RESUELTA', 'EN_PROGRESO', datetime('now', '-40 days'), 'En equipos con ahorro de bateria siguen llegando tarde. Se reabre.', 31, 3),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-30 days'), 'Se solicita excepcion de ahorro de bateria.', 31, 5),
    ('RESUELTA', 'VALIDADA', datetime('now', '-29 days'), 'QA lo prueba en tres modelos.', 31, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-28 days'), 'Se cierra.', 31, 3);

-- Incidencia 32
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-56 days'), 'Detectada en pruebas de compatibilidad.', 32, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-55 days'), 'Se reproduce en un equipo de prueba.', 32, 2);

-- Incidencia 33
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-280 days'), 'Detectada en la conciliacion.', 33, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-279 days'), 'Se revisa la regla de unificacion.', 33, 2),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-270 days'), 'Se unifican por RUT.', 33, 2),
    ('RESUELTA', 'VALIDADA', datetime('now', '-269 days'), 'Conciliacion conforme.', 33, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-268 days'), 'Se cierra.', 33, 3);

-- Incidencia 34
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-250 days'), 'Reportada por operaciones.', 34, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-249 days'), 'Se analiza el proceso.', 34, 5),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-240 days'), 'Se divide la carga en lotes paralelos.', 34, 5),
    ('RESUELTA', 'VALIDADA', datetime('now', '-239 days'), 'Termina dentro de la ventana.', 34, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-238 days'), 'Se cierra.', 34, 3);

-- Incidencia 35
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-220 days'), 'Detectada en pruebas de acceso.', 35, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-219 days'), 'Se revisa el mapeo de perfiles.', 35, 2),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-215 days'), 'Se asignan los perfiles equivalentes.', 35, 2),
    ('RESUELTA', 'VALIDADA', datetime('now', '-214 days'), 'QA lo verifica con cada perfil.', 35, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-213 days'), 'Se cierra.', 35, 3);

-- Incidencia 36
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-190 days'), 'Detectada en la validacion de datos.', 36, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-188 days'), 'Se revisa la conversion de fechas.', 36, 5),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-182 days'), 'Se corrige la zona horaria de origen.', 36, 5),
    ('RESUELTA', 'VALIDADA', datetime('now', '-181 days'), 'Fechas conformes.', 36, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-180 days'), 'Se cierra.', 36, 3);

-- Incidencia 37
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-160 days'), 'Detectada en la revision de nombres.', 37, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-159 days'), 'Se revisa la codificacion del archivo.', 37, 2),
    ('EN_PROGRESO', 'RESUELTA', datetime('now', '-150 days'), 'Se convierte el origen a UTF-8.', 37, 2),
    ('RESUELTA', 'VALIDADA', datetime('now', '-149 days'), 'Nombres conformes.', 37, 3),
    ('VALIDADA', 'CERRADA', datetime('now', '-148 days'), 'Se cierra.', 37, 3);

-- Incidencia 38
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-8 days'), 'Detectada en el cierre del proyecto.', 38, 4),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-7 days'), 'Se buscan los registros faltantes.', 38, 2);

-- Incidencia 39
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-4 days'), 'Solicitud del equipo de soporte.', 39, 4);

-- Incidencia 40
INSERT INTO HISTORIAL_INCIDENCIA (estado_anterior, estado_nuevo, fecha_cambio, comentario, id_incidencia, modificado_por) VALUES
    (NULL, 'ABIERTA', datetime('now', '-3 days'), 'Observacion de los usuarios.', 40, 3),
    ('ABIERTA', 'EN_PROGRESO', datetime('now', '-2 days'), 'Se agrega la paginacion.', 40, 5);


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
    -- Metrica global: se distingue por id_proyecto NULL, no por el nombre del
    -- tipo. Codificar el ambito tambien en el nombre lo diria dos veces.
    ('INDICE_SALUD',            68.3,  datetime('now', '-1 days'), NULL);
