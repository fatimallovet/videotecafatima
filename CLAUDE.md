# Videoteca Fátima — contexto para Claude Code

Catálogo personal y curado de películas y series que he visto: https://fatimallovet.github.io/videotecafatima
No es solo una base de datos. Es un espacio de recomendaciones con voz propia: debe verse pulido, coherente y reflejar mi gusto.
Proyecto hermano: **Biblioteca Fátima** (catálogo de libros, mismo estilo; chip verde salvia en la nav).

## Stack
- SPA en **HTML/CSS/JS vanilla**, sin frameworks ni build. Archivos principales: `index.html`, `style.css`, `script.js`.
- Hosting: **GitHub Pages** (lo que está en `main` es lo que está publicado).
- Datos: **dos Google Sheets publicadas como CSV**, parseadas con **PapaParse**. Los datos se editan en la hoja, no en el repo.
- `streaming.json`: lo genera un **GitHub Action semanal** que corre `update-streaming.js` (Node). Consulta la **TMDB API v3** con los IDs de IMDB y hace commit del resultado automáticamente. El frontend lo carga en paralelo con los CSV.
- `info.html`: se carga con fetch y se inyecta como fragmento (sección «Cómo funciona» e instrucciones para instalar en iOS/Android).
- Analítica: GA4 (**solo en `index.html`**, porque `info.html` es un fragmento) + Cloudflare Web Analytics.

## Funcionalidades actuales
- Grid de tarjetas con póster (URL de TMDB guardada en la hoja) y una distinción sutil entre película y serie (tinte salvia / tinte azul). La nota y el ♡ van **siempre visibles** sobre el póster (en táctil no hay hover); debajo, solo el título y «año · primer género» (la lista completa está en la ficha). Si falta el póster, o no carga, la tarjeta muestra un bloque del color del género (`.banda-*`) con el icono del tipo, de la misma altura que las demás. El icono de tipo (película/serie) solo se ve en los resultados de una colección, donde se mezclan. El ancho común es `--ancho-contenido` (1200px) para menú, buscador y grillas; la grilla usa `minmax(158px, 1fr)` (6 columnas en escritorio, 4 en tablet) y 2 columnas en móvil.
- Ficha (modal): hero fijo con degradado carbón oscuro (póster, título, estrellas, subtítulo) y un cuerpo con scroll (tarjetas de metadatos, reseña, flags, chips de género, tono, ritmo y público, píldoras de streaming).
- Pestaña **Colecciones** (antes «Por mood»): 15 colecciones al estilo Netflix, con el género como criterio principal, un degradado por colección, orden alfabético, tarjetas compactas y **sin emoji**. La clasificación vive en JS; usa `revisarCoberturaMoods()` en la consola para revisar la cobertura.
- **Wishlist** en localStorage, con FAB en escritorio e integración en la bottom-nav en móvil. `_enriquecerDeseo` completa el año y el póster faltantes a partir del catálogo al compartir.
- Compartir: menú para elegir texto o imagen. Las imágenes se generan con canvas: ficha en formato fijo 4:5 (1080×1350, reseña centrada; si no cabe se corta en la última oración completa con «[…]») y wishlist a 720px. El texto y la imagen de una ficha llevan el enlace directo a esa ficha. El texto está pensado para **WhatsApp** (`*negrita*`, `_cursiva_`): breve, con un extracto de ~300 caracteres de la reseña cortado en oración completa; `_waLimpio()` quita `* _ ~` de los textos de la hoja para que no se interpreten como formato.
- Rutas por hash: `#peliculas`, `#series`, `#moods`, `#moods/[moodKey]`, `#como-funciona` y, para abrir una ficha, `#peliculas/[slug]` / `#series/[slug]` (slug = título sin acentos ni símbolos, ej. `#peliculas/que-bello-es-vivir`). Funciona el botón atrás.
- Nav superior sticky con iconos de trazo (sprite SVG inline en `index.html`) + bottom-nav fija en el menú compacto. Chips en forma de píldora (salvia = Biblioteca, ámbar = Apoyar/Buy Me a Coffee) que en pantallas angostas se reducen al icono. **Solo hay dos breakpoints: 600px (móvil) y 1000px (menú compacto)**; no agregues otros.

## Gotchas (no volver a tropezar)
- **TMDB: usar la API key v3, no el token JWT v4.** Va en el secret `TMDB_API_KEY` del repo. Nunca la pongas en el código ni en commits.
- **Clipboard + canvas:** la `Promise` de la imagen se le pasa a `clipboard.write()` **en el mismo click**, antes de generar la imagen de forma asíncrona. Si se difiere, se pierde el permiso del gesto del usuario y falla en silencio en escritorio.
- **CORS en canvas:** los pósters de TMDB pasan por el proxy `images.weserv.nl`; la URL directa queda solo como fallback.
- **Clasificación de colecciones:** el género es el criterio principal (las keywords de mood clasificaban mal). «Navideñas» es exclusiva (return temprano). K-dramas = el campo Origen contiene «Corea». «Dramas» solo aplica si no hay un género que la contradiga. Un título puede estar en varias colecciones, por eso la lógica vive en el código y no en el CSV.
- **Fichas por URL:** al abrir una ficha desde el sitio se usa `history.pushState` (no dispara `hashchange`, así la pestaña de fondo no cambia) y `cerrarModal()` hace `history.back()`; si se llegó por un enlace directo solo reescribe la URL con `replaceState`. El router (`aplicarHash`) solo usa `ocultarModal()`, que no toca el historial. Una ficha pedida por enlace espera a los CSV **y** a `streaming.json` antes de abrirse. El campo `Tipo` no viene de la hoja: la app lo agrega al abrir/compartir una ficha (`Object.assign(..., { Tipo })`); si pasas un registro crudo a las funciones de compartir saldrá como «Serie».
- **Pósters manuales:** decidí no traerlos automáticamente de TMDB. Las URLs se capturan a mano en la hoja por precisión (títulos bilingües: título en español + original entre paréntesis). No lo propongas de nuevo.

## Cómo trabajo
- Cambios **de uno o dos a la vez**; si algo sale mal, lo revierto. No mezcles muchos cambios en un mismo commit o PR.
- Proceso iterativo y visual: propón alternativas y yo digo «me convence» / «no me convence».
- Estética: paletas apagadas y cohesivas, layouts limpios. **No** a lo pesado o recargado. Rechazos previos: banner verde (cansado), badge circular de calificación (raro), borde izquierdo duro en tarjetas (desordenado), emoji en las tarjetas de colecciones.
- Antes de cambiar la lógica de clasificación, valídala contra el catálogo real (con simulación y/o ejecución en vivo).
- No propongas alternativas que ya descarté. Explica el qué y el porqué; señala riesgos y dependencias antes de cambiar algo.

## Git
- Antes trabajaba solo desde la interfaz web de GitHub. Mezclar subidas web con commits locales causó divergencias (la carpeta local estaba ligada por error a `bibliotecafa.git`).
- En Claude Code: **haz `git pull` antes de empezar**, trabaja en una rama y abre un PR; yo lo reviso y hago merge en GitHub. No hagas push directo a `main` sin que te lo pida.
- El Action semanal hace commits de `streaming.json` en `main`; ten esto en cuenta para evitar conflictos.

## Respaldos
- Respaldos manuales en «Respaldo Videoteca», en el Escritorio de mi Mac (código + copias de la hoja).
- Todo está en mi cuenta personal y el proyecto no tiene costo. Si algo depende de un servicio de pago, avísame antes.
