# Evaluación de la precisión del clasificador

Esta carpeta sirve para medir **cuánto acierta** el motor de clasificación automática
(semana 10 del plan). Las pruebas automáticas del proyecto comprueban que el motor
funcione; esta evaluación mide qué tan bien decide.

## Cómo se hace

1. `casos-clasificacion.csv` trae 48 incidencias de ejemplo escritas **sin mirar el
   léxico del motor** (`src/utils/lexico.js`), para no redactarlas a su medida.
2. Una persona (la autora del proyecto) decide la categoría y la prioridad correctas de
   cada una **sin consultar al motor**. Esas respuestas son la referencia.
3. Un script compara la referencia con lo que responde el motor y calcula el porcentaje
   de aciertos y la matriz de confusión.

## Cómo llenar la planilla

Abre `casos-clasificacion.csv` con Excel. Llena dos columnas en cada fila:

- **categoria_correcta**: `DISPONIBILIDAD`, `RENDIMIENTO`, `SEGURIDAD`,
  `USABILIDAD_INTERFAZ`, `DATOS_INTEGRIDAD` u `OTRO`.
- **prioridad_correcta**: `ALTA`, `MEDIA` o `BAJA`.

Escribe los valores tal como aparecen arriba: en mayúsculas, sin tildes y con guion bajo.

La columna **notas** es opcional. Úsala cuando dudes entre dos opciones, por ejemplo
`dudé con RENDIMIENTO`. Esos casos dudosos son material para el análisis de resultados.

Al guardar, Excel puede preguntar si quieres mantener el formato CSV: responde que sí.
No cambies los textos ni el orden de las filas.

### Reglas para que la medición valga

- **No consultes al motor mientras llenas.** Eso incluye la sugerencia en vivo de la
  pantalla de registro y la ruta `/api/incidencias/clasificar`. Si ves su respuesta antes
  de decidir, tu opinión se contamina y el porcentaje deja de medir algo.
- **Decide cada caso por el texto, como lo harías en el trabajo real.** Ningún caso tiene
  una respuesta "esperada" por el autor de los textos.
- **Siempre elige una opción**, incluso si dudas. Una fila vacía no se puede evaluar.

### Definiciones de referencia

Si tu tesis tiene sus propias definiciones, usa esas y tradúcelas a estos valores.

| Categoría | Cuándo corresponde |
|---|---|
| DISPONIBILIDAD | El sistema o una parte de él no está, no responde o se cae |
| RENDIMIENTO | Funciona, pero lento o consumiendo demasiados recursos |
| SEGURIDAD | Alguien accede a lo que no debe, o hay datos sensibles expuestos |
| USABILIDAD_INTERFAZ | Funciona, pero cuesta usarlo, entenderlo o leerlo |
| DATOS_INTEGRIDAD | Los datos quedan mal: errados, perdidos, duplicados o incoherentes |
| OTRO | No calza en ninguna de las anteriores: preguntas, peticiones generales |

| Prioridad | Cuándo corresponde |
|---|---|
| ALTA | Impide trabajar, afecta a muchos, expone datos o causa daño económico |
| MEDIA | Molesta o afecta a una parte, pero existe una forma de seguir trabajando |
| BAJA | Detalle menor, estético o una mejora deseable |

## Advertencia metodológica

Si después de medir se ajusta el léxico para corregir los errores encontrados, **estos 48
casos dejan de servir para medir**: el motor estaría aprendiendo las respuestas de la
misma prueba. En ese caso hay que medir de nuevo con casos nuevos y reportar las dos
cifras, antes y después del ajuste.
