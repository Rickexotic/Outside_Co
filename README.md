# Plantilla de presentaciones

Presentación de una página (scroll vertical) cuyo contenido, marca y colores se definen **solo en JSON**. Para una presentación nueva basta con reemplazar `data/content.json` y `assets/`.

## Uso

```
python -m http.server 8000
```

- `http://localhost:8000/` → carga `data/content.json`.
- `http://localhost:8000/?content=data/content.demo.json` → carga otro JSON (ruta relativa, solo `.json`).
- Ejemplos incluidos: `content.demo.json` (todos los gráficos, datos ficticios) y `cduc-estrategia-2035.json`.
- El botón "Guardar" del cierre descarga un HTML autónomo (JSON y recursos incrustados).

## Esquema de `content.json`

| Clave | Descripción |
|---|---|
| `language` | Código de idioma/formato numérico (`es`, `en`…). |
| `brand` | `name`, `storageKey` (preferencia de tema), `downloadName`. El logo y la portada de Outside (buscador + logo) son fijos en la plantilla y no se configuran aquí. |
| `intro` | Ignorado: la primera slide siempre es la portada de Outside. |
| `client` | `name`, `logo` (opcional). Si hay logo, aparece en la slide `client`. |
| `presentation` | `title`, `subtitle` (usados por la slide `hero` y el título de la pestaña). |
| `theme` | Opcional. `light` y `dark`: variables CSS sin `--` (`navy`, `lavender`, `lime`, `bg`, `bg-soft`, `card`, `border`, `text`, `text-soft`, `chart-1`…`chart-5`). `font`: tipografía. |
| `slides` | Lista ordenada de slides (abajo). |

Campos comunes a toda slide: `type`, `id` (ancla), `eyebrow`, `title`, `note` (texto al pie), `alternate` (fondo alterno), `cols` (columnas máximas en grillas).

### Tipos de slide base

| `type` | Campos |
|---|---|
| `hero` | `eyebrow`; título/subtítulo desde `presentation` (o `title`/`subtitle` propios). |
| `client` | `eyebrow?` ("Preparado para"), `title?` (por defecto `client.name`), `subtitle?`; muestra `client.logo` grande. |
| `summary` | `items: [{title, text, tag?, number?}]` |
| `metric` | `value`, `prefix?`, `suffix?`, `decimals?`, `label` (contador animado) |
| `columns` | `columns: [{title, items: [texto]}]` |
| `cards` | `items: [texto]` |
| `list` | `items: [texto]` |
| `ecosystem` | `center`, `items` (hasta 4 satélites) |
| `statement` | `text`, `highlight?` |
| `timeline` | `items: [texto]` |
| `recommendations` | `items: [texto o {title, text}]` |
| `closing` | `text`, `actions: ["pdf","download","share"]` |

### Gráficos (opcionales; solo se renderizan si se usan)

Comunes: `caption`, `source`, `tone: "ink"` (panel oscuro), `format: {prefix, suffix, decimals, compact}`.

- **`area-chart`**: `labels: [..]`, `series: [{name, values: [..], color?}]`, `highlight` (índice, `"max"`, `"min"`, `"first"`, `"last"`), `min?`, `max?`, `grid?`. La primera serie lleva relleno y glow; el punto destacado se mueve con el cursor, toque o flechas del teclado.
- **`bar-chart`**: `items: [{label, value}]`, `orientation: "horizontal" | "vertical"`, `highlight?`, `max?`.
- **`donut-chart`**: `items: [{label, value, color?, detail?}]`, `center: {value?, label?}`. Resalta al pasar el cursor.
- **`kpis`**: `items: [{label, value, prefix?, suffix?, decimals?, delta?, trend?: "up"|"down", note?, spark?: [números]}]`.

Paleta: los gráficos usan `--chart-1…5` (por defecto lavanda, lima, texto, texto suave, borde). Respetan modo claro/oscuro, `prefers-reduced-motion` y la impresión a PDF.

## Archivos

`index.html` (shell), `app.js` (render + componentes), `styles.css` (diseño y gráficos), `data/` (contenidos), `assets/` (logos, sonido).
