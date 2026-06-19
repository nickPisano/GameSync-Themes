# Contributing a theme

Thanks for adding to the GameSync theme gallery! Contributing a theme is just
**one new file** in `themes/`.

## Steps

1. **Create one `.json` file** in `themes/`. The filename becomes the theme's
   `id` in the catalog, so name it after your theme in lowercase with dashes:

   ```
   themes/cosmic-latte.json
   ```

2. **Fill in the colors.** Start from this template:

   ```json
   {
     "name": "Cosmic Latte",
     "colors": {
       "bg": "#fff8e7",
       "panel": "#f6efda",
       "panel-2": "#ece3c8",
       "border": "#ddd2b0",
       "text": "#2a2620",
       "muted": "#6b6453",
       "accent": "#b07d2b",
       "accent-hover": "#946823",
       "ok": "#2f7d32",
       "err": "#c0392b",
       "warn": "#9a6b00"
     }
   }
   ```

   - **Required keys:** `bg`, `panel`, `border`, `text`, `muted`, `accent`.
   - **Optional keys:** `panel-2` (defaults to `panel`), `accent-hover`
     (defaults to `accent`), `ok`, `err`, `warn`.
   - All color values must be `#rrggbb` hex (six digits, lowercase preferred).
   - `name` is at most **40 characters**.

3. **Aim for accessible contrast.** Themes should be comfortable to read:
   - `text` on `bg` should meet **WCAG AA** for body text (contrast ratio
     **≥ 4.5:1**).
   - `muted` on `bg` should be at least **≥ 4.5:1** where you can manage it, and
     never below **3:1**.
   - `accent` on `bg`/`panel` should reach at least **3:1** so buttons and links
     stand out.

   The [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
   is a quick way to verify.

4. **Validate and regenerate the catalog.** From the repo root (Node.js 18+, no
   dependencies to install):

   ```bash
   npm run validate     # checks JSON, required keys, hex format, name length
   npm run index        # regenerates themes/index.json
   npm run previews     # regenerates assets/previews/<id>.svg for the gallery
   ```

   Commit the regenerated `themes/index.json` and `assets/previews/<id>.svg`
   along with your theme file. (`npm run check` runs all three checks at once,
   the same as CI.)

5. **Open a pull request.** CI re-runs the validator and confirms
   `themes/index.json` is up to date, so make sure both commands pass locally
   first.

## Naming rules

- **Filename:** lowercase, words separated by dashes, ending in `.json`
  (`midnight-blue.json`). This is the catalog `id` and must be unique.
- **`name` field:** human-readable, up to 40 characters (`Midnight Blue`).
- Keep names descriptive and avoid duplicating an existing theme's name.

## What CI checks

Each pull request runs `scripts/validate.mjs`, which fails if any theme:

- is not valid JSON,
- is missing a required key (`bg`, `panel`, `border`, `text`, `muted`,
  `accent`),
- contains a color that is not a `#rrggbb` hex value,
- has an unknown key, or
- has a `name` longer than 40 characters.

It also runs `node scripts/generate-index.mjs --check` and
`node scripts/generate-previews.mjs --check` to ensure `themes/index.json` and
`assets/previews/` match the themes on disk.

By contributing, you agree your theme is released under the project's
[MIT License](LICENSE).
