# GameSync Themes

A community gallery of color themes for **GameSync**, the desktop game-save
backup & sync app. Browse the gallery below, grab a theme's JSON, and paste it
into GameSync to restyle the whole app.

Every theme here is validated in CI and checked for strong text-on-background
contrast, so they stay readable on real displays.

---

## Install a theme into GameSync

1. Open the theme's `.json` file from the [gallery](#gallery) (click the link in
   the **Theme** column) and copy its contents — or download the file.
2. In GameSync, go to **Settings → Appearance**.
3. Choose **Import** and select the downloaded `.json` file, **or** **Paste
   JSON** and paste the contents you copied.
4. Apply. The new colors take effect immediately.

To switch back, import a different theme or restore the default from the same
screen.

> **Tip:** A theme only needs the six required colors (`bg`, `panel`, `border`,
> `text`, `muted`, `accent`). The rest are optional and fall back to sensible
> defaults — see [Theme format](#theme-format).

---

## Gallery

Swatches show each theme's **background** and **accent** color.

### Dark

| Theme | Background | Accent |
|---|---|---|
| [Midnight Blue](themes/midnight-blue.json) | ![bg](https://img.shields.io/badge/%230f1216-0f1216?style=flat-square) | ![accent](https://img.shields.io/badge/%234f8cff-4f8cff?style=flat-square) |
| [Nord Aurora](themes/nord-aurora.json) | ![bg](https://img.shields.io/badge/%232e3440-2e3440?style=flat-square) | ![accent](https://img.shields.io/badge/%2388c0d0-88c0d0?style=flat-square) |
| [Dracula Night](themes/dracula-night.json) | ![bg](https://img.shields.io/badge/%23282a36-282a36?style=flat-square) | ![accent](https://img.shields.io/badge/%23bd93f9-bd93f9?style=flat-square) |
| [Everforest Dark](themes/everforest-dark.json) | ![bg](https://img.shields.io/badge/%231e2326-1e2326?style=flat-square) | ![accent](https://img.shields.io/badge/%23a7c080-a7c080?style=flat-square) |
| [Solarized Dark](themes/solarized-dark.json) | ![bg](https://img.shields.io/badge/%23002b36-002b36?style=flat-square) | ![accent](https://img.shields.io/badge/%23268bd2-268bd2?style=flat-square) |

### Light

| Theme | Background | Accent |
|---|---|---|
| [Daylight](themes/daylight.json) | ![bg](https://img.shields.io/badge/%23ffffff-ffffff?style=flat-square) | ![accent](https://img.shields.io/badge/%232563eb-2563eb?style=flat-square) |
| [Solarized Light](themes/solarized-light.json) | ![bg](https://img.shields.io/badge/%23fdf6e3-fdf6e3?style=flat-square) | ![accent](https://img.shields.io/badge/%23268bd2-268bd2?style=flat-square) |
| [Sakura Light](themes/sakura-light.json) | ![bg](https://img.shields.io/badge/%23fff5f7-fff5f7?style=flat-square) | ![accent](https://img.shields.io/badge/%23d6336c-d6336c?style=flat-square) |

A machine-readable catalog of all themes lives in
[`themes/index.json`](themes/index.json).

---

## Theme format

One `.json` file per theme:

```json
{
  "name": "Theme name (max 40 chars)",
  "colors": {
    "bg": "#0f1216", "panel": "#171b21", "panel-2": "#1e242c",
    "border": "#2a313b", "text": "#e6e9ee", "muted": "#8b95a3",
    "accent": "#4f8cff", "accent-hover": "#3d7bf0",
    "ok": "#3fb950", "err": "#f85149", "warn": "#d29922"
  }
}
```

**Required:** `bg`, `panel`, `border`, `text`, `muted`, `accent`.

**Optional:** `panel-2` (defaults to `panel`), `accent-hover` (defaults to
`accent`), `ok`, `err`, `warn`.

All values are `#rrggbb` hex. The `name` is at most 40 characters.

| Key | Role |
|---|---|
| `bg` | Base background — the darkest (or lightest) layer |
| `panel` | Panel / surface background |
| `panel-2` | Raised panel background |
| `border` | Borders and dividers |
| `text` | Primary foreground text |
| `muted` | Secondary / muted text |
| `accent` | Interactive / brand color |
| `accent-hover` | Accent hover state |
| `ok` / `err` / `warn` | Success / error / warning status colors |

The formal definition lives in
[`schema/theme.schema.json`](schema/theme.schema.json).

---

## Repository layout

```
themes/             One .json per theme, plus a generated index.json catalog
schema/             JSON Schema for a theme file
scripts/            Node validator + index generator (zero dependencies)
.github/workflows/  CI that validates every theme on each PR
```

## Validate and regenerate locally

Requires Node.js 18+. No dependencies to install.

```bash
node scripts/validate.mjs            # validate every theme in themes/
node scripts/generate-index.mjs      # regenerate themes/index.json
```

Or via npm:

```bash
npm run validate
npm run index
npm run check     # validate + verify index.json is up to date (what CI runs)
```

## Contributing

New themes are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). In short: add
one `.json` file to `themes/`, run `npm run validate` and `npm run index`, and
open a pull request.

## License

[MIT](LICENSE).
