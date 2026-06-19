#!/usr/bin/env node
// Renders an SVG preview of a mock GameSync window for every theme, so the
// README gallery shows what each theme actually looks like. Output lands in
// assets/previews/<id>.svg.
//
// Usage:
//   node scripts/generate-previews.mjs           Write all preview SVGs
//   node scripts/generate-previews.mjs --check    Verify they are up to date (CI)

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(root, "themes");
const outDir = join(root, "assets", "previews");

const checkOnly = process.argv.includes("--check");

function lin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
// Readable text color to place on top of a filled swatch (e.g. the accent button).
function onColor(hex) {
  return luminance(hex) > 0.45 ? "#101317" : "#ffffff";
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function svgFor(theme) {
  const c = theme.colors;
  const panel2 = c["panel-2"] ?? c.panel;
  const accent = c.accent;
  const ok = c.ok ?? accent;
  const warn = c.warn ?? accent;
  const err = c.err ?? accent;
  const onAccent = onColor(accent);
  const name = esc(theme.name);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190" viewBox="0 0 340 190" role="img" aria-label="${name} theme preview">
  <title>${name} theme preview</title>
  <rect x="0.5" y="0.5" width="339" height="189" rx="14" fill="${c.bg}" stroke="${c.border}"/>
  <!-- window controls -->
  <circle cx="22" cy="24" r="5" fill="${err}"/>
  <circle cx="40" cy="24" r="5" fill="${warn}"/>
  <circle cx="58" cy="24" r="5" fill="${ok}"/>
  <text x="78" y="28" font-family="${font}" font-size="12" font-weight="600" fill="${c.text}">${name}</text>
  <!-- sidebar -->
  <rect x="16" y="44" width="104" height="130" rx="9" fill="${c.panel}" stroke="${c.border}"/>
  <rect x="24" y="56" width="88" height="20" rx="6" fill="${accent}"/>
  <text x="33" y="70" font-family="${font}" font-size="11" font-weight="600" fill="${onAccent}">Library</text>
  <text x="33" y="96" font-family="${font}" font-size="11" fill="${c.muted}">Saves</text>
  <text x="33" y="116" font-family="${font}" font-size="11" fill="${c.muted}">Cloud</text>
  <text x="33" y="136" font-family="${font}" font-size="11" fill="${c.muted}">History</text>
  <text x="33" y="156" font-family="${font}" font-size="11" fill="${c.muted}">Settings</text>
  <!-- main panel -->
  <rect x="128" y="44" width="196" height="130" rx="9" fill="${panel2}" stroke="${c.border}"/>
  <text x="142" y="70" font-family="${font}" font-size="14" font-weight="700" fill="${c.text}">All saves synced</text>
  <text x="142" y="90" font-family="${font}" font-size="11" fill="${c.muted}">Last backup · 2m ago</text>
  <text x="142" y="106" font-family="${font}" font-size="11" fill="${c.muted}">12 slots · 1.2 GB</text>
  <line x1="142" y1="118" x2="310" y2="118" stroke="${c.border}"/>
  <rect x="142" y="130" width="84" height="26" rx="7" fill="${accent}"/>
  <text x="184" y="147" font-family="${font}" font-size="11" font-weight="600" fill="${onAccent}" text-anchor="middle">Sync now</text>
  <circle cx="250" cy="143" r="5" fill="${ok}"/>
  <circle cx="272" cy="143" r="5" fill="${warn}"/>
  <circle cx="294" cy="143" r="5" fill="${err}"/>
</svg>
`;
}

const files = readdirSync(themesDir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort();

mkdirSync(outDir, { recursive: true });

let stale = 0;
for (const file of files) {
  const id = file.replace(/\.json$/, "");
  const theme = JSON.parse(readFileSync(join(themesDir, file), "utf8"));
  const svg = svgFor(theme);
  const outPath = join(outDir, `${id}.svg`);

  if (checkOnly) {
    let current = "";
    try {
      current = readFileSync(outPath, "utf8");
    } catch {
      /* missing => stale */
    }
    if (current !== svg) {
      console.error(`  stale: assets/previews/${id}.svg`);
      stale++;
    }
  } else {
    writeFileSync(outPath, svg);
  }
}

if (checkOnly) {
  if (stale > 0) {
    console.error(
      `${stale} preview(s) out of date. Run \`npm run previews\` and commit assets/previews/.`
    );
    process.exit(1);
  }
  console.log(`All ${files.length} preview(s) up to date.`);
} else {
  console.log(`Wrote ${files.length} preview(s) to assets/previews/.`);
}
