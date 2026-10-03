# Diagramas

Las figuras del proyecto, escritas en [Mermaid](https://mermaid.js.org/).

| Figura | Qué muestra | De dónde sale |
|---|---|---|
| [`modelo-entidad-relacion.md`](modelo-entidad-relacion.md) | Las cinco entidades, sus atributos y sus relaciones | `backend/src/db/schema.sql` |
| [`maquina-de-estados.md`](maquina-de-estados.md) | El flujo de estados de una incidencia | `TRANSICIONES` en `backend/src/services/incidencia.service.js` |
| [`arquitectura.md`](arquitectura.md) | El recorrido de una petición por las tres capas, y dónde se conectan los diferenciadores | La estructura de `backend/src/` |

## Por qué Mermaid y no imágenes

Un diagrama en Mermaid es texto. Eso da tres cosas que un `.png` no da:

- **GitHub lo renderiza solo**, así que la figura se ve al abrir el archivo.
- **Entra en el control de versiones de verdad**: un cambio aparece en el diff,
  línea por línea. Una imagen binaria solo dice "cambió".
- **No se desincroniza en silencio.** Si alguien agrega una columna al esquema y
  olvida la figura, el diff de ese commit muestra que el `.sql` cambió y el
  diagrama no.

El arte ASCII de [`../modelo-datos.md`](../modelo-datos.md) se mantiene: funciona
sin renderizador y se lee en cualquier parte. Las dos versiones muestran lo mismo
y conviene que sigan coincidiendo.

## Cómo exportarlas para la memoria

Para pegarlas en el documento escrito hace falta una imagen. Dos caminos:

1. **mermaid.live** — pegar el contenido del bloque ` ```mermaid ` y descargar en
   PNG o SVG. Para la memoria conviene **SVG**: no se pixela al imprimir.
2. **CLI**, si se prefiere automatizar:

   ```bash
   npx -y @mermaid-js/mermaid-cli -i docs/diagramas/maquina-de-estados.md -o er.svg
   ```

   Genera un archivo por bloque del documento. No se agrega como dependencia del
   proyecto: se usa una vez al exportar.

Las imágenes exportadas **no van al repositorio**: se generan cuando se necesitan
y tenerlas versionadas sería justamente la desincronización que este formato
evita.

## Al modificar una figura

Estos documentos repiten información que ya vive en el código, y lo hacen a
propósito: el código es la verdad y la figura es la explicación. Si cambia uno,
cambian los dos en el mismo commit.
