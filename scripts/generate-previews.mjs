#!/usr/bin/env node
// Renders an SVG preview of a mock GameSync window for every theme, so the
// README gallery shows what each theme actually looks like. Output lands in
// assets/previews/<id>.svg.
//
// Themes without an `effects` block render flat (solid panels). Themes with
// `effects.style` get a richer surface treatment so the gallery actually shows
// the aesthetic:
//   glass  — vivid blurred backdrop + translucent frosted panels + rim light
//   neo    — monochrome material with soft dual (light/dark) shadows
//   skeuo  — material gradients, glossy beveled panels and buttons, soft texture
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

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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

// --- small color helpers for the effect renderers ---------------------------
function hexToRgb(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}
function rgbToHex([r, g, b]) {
  const ch = (v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}
function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t,
  ]);
}
const lighten = (h, t) => mix(h, "#ffffff", t);
const darken = (h, t) => mix(h, "#000000", t);
function gradStops(list) {
  const n = list.length - 1;
  return list
    .map(
      (s, i) =>
        `<stop offset="${n ? (i / n).toFixed(3) : "0"}" stop-color="${s}"/>`
    )
    .join("");
}

// Static soft-orb layer for themes whose effects request `bubbles`. Tinted by
// bubbleColor (falling back to highlight, then accent — same order as the app).
// Positions are fixed so previews stay deterministic for --check, and the layer
// is injected behind the panels so it reads as a background effect (and shows
// through translucent glass panels). Returns "" when bubbles are off, so themes
// without bubbles render byte-for-byte as before.
const BUBBLES = [
  [40, 150, 14, 0.5], [300, 122, 12, 0.45], [168, 172, 16, 0.5],
  [92, 62, 8, 0.4], [250, 40, 10, 0.45], [128, 112, 6, 0.4],
  [210, 140, 9, 0.5], [60, 100, 7, 0.4], [292, 168, 11, 0.45],
];
function bubbleParts(on, color) {
  if (!on) return { defs: "", layer: "" };
  const defs =
    `\n    <radialGradient id="bubble" cx="0.35" cy="0.32" r="0.7">` +
    `<stop offset="0" stop-color="${color}" stop-opacity="0.85"/>` +
    `<stop offset="0.6" stop-color="${color}" stop-opacity="0.22"/>` +
    `<stop offset="0.85" stop-color="${color}" stop-opacity="0"/></radialGradient>` +
    `\n    <clipPath id="bubbleclip"><rect x="0.5" y="0.5" width="339" height="189" rx="14"/></clipPath>`;
  const orbs = BUBBLES.map(
    ([cx, cy, r, o]) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bubble)" opacity="${o}"/>`
  ).join("\n    ");
  const layer = `\n  <g clip-path="url(#bubbleclip)">\n    ${orbs}\n  </g>`;
  return { defs, layer };
}

// --- flat renderer (unchanged; used for themes without effects) -------------
function flatSvg(theme) {
  const c = theme.colors;
  const panel2 = c["panel-2"] ?? c.panel;
  const accent = c.accent;
  const ok = c.ok ?? accent;
  const warn = c.warn ?? accent;
  const err = c.err ?? accent;
  const onAccent = onColor(accent);
  const name = esc(theme.name);
  const font = FONT;

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

// --- glassmorphism ----------------------------------------------------------
function glassSvg(theme) {
  const c = theme.colors;
  const fx = theme.effects;
  const panel = c.panel;
  const accent = c.accent;
  const ok = c.ok ?? accent;
  const warn = c.warn ?? accent;
  const err = c.err ?? accent;
  const onAccent = onColor(accent);
  const name = esc(theme.name);

  const grad = fx.gradient ?? [lighten(c.bg, 0.12), c.bg, darken(c.bg, 0.06)];
  const blur = fx.blur ?? 9;
  const opacity = fx.opacity ?? 0.6;
  const op2 = Math.min(1, opacity + 0.18);
  const hl = fx.highlight ?? lighten(panel, 0.5);
  const glow = fx.glow ?? accent;
  const { defs: bubDefs, layer: bubLayer } = bubbleParts(!!fx.bubbles, fx.bubbleColor ?? hl);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190" viewBox="0 0 340 190" role="img" aria-label="${name} theme preview">
  <title>${name} theme preview (glass)</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">${gradStops(grad)}</linearGradient>
    <linearGradient id="frost" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hl}" stop-opacity="0.5"/>
      <stop offset="0.55" stop-color="${panel}" stop-opacity="${opacity}"/>
      <stop offset="1" stop-color="${panel}" stop-opacity="${op2}"/>
    </linearGradient>
    <linearGradient id="glassBtn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lighten(accent, 0.28)}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <filter id="blobs" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="${glow}" flood-opacity="0.85"/></filter>
    <clipPath id="card"><rect x="0.5" y="0.5" width="339" height="189" rx="14"/></clipPath>${bubDefs}
  </defs>
  <rect x="0.5" y="0.5" width="339" height="189" rx="14" fill="url(#bg)" stroke="${c.border}"/>
  <g clip-path="url(#card)" filter="url(#blobs)">
    <circle cx="300" cy="28" r="48" fill="${accent}" opacity="0.5"/>
    <circle cx="36" cy="172" r="52" fill="${ok}" opacity="0.45"/>
    <circle cx="250" cy="186" r="56" fill="${err}" opacity="0.4"/>
  </g>${bubLayer}
  <!-- window controls -->
  <circle cx="22" cy="24" r="5" fill="${err}"/>
  <circle cx="40" cy="24" r="5" fill="${warn}"/>
  <circle cx="58" cy="24" r="5" fill="${ok}"/>
  <text x="78" y="28" font-family="${FONT}" font-size="12" font-weight="600" fill="${c.text}">${name}</text>
  <!-- sidebar (frosted) -->
  <rect x="16" y="44" width="104" height="130" rx="11" fill="url(#frost)" stroke="${hl}" stroke-opacity="0.6"/>
  <rect x="24" y="56" width="88" height="20" rx="7" fill="url(#glassBtn)" stroke="${hl}" stroke-opacity="0.75"/>
  <text x="33" y="70" font-family="${FONT}" font-size="11" font-weight="600" fill="${onAccent}">Library</text>
  <text x="33" y="96" font-family="${FONT}" font-size="11" fill="${c.muted}">Saves</text>
  <text x="33" y="116" font-family="${FONT}" font-size="11" fill="${c.muted}">Cloud</text>
  <text x="33" y="136" font-family="${FONT}" font-size="11" fill="${c.muted}">History</text>
  <text x="33" y="156" font-family="${FONT}" font-size="11" fill="${c.muted}">Settings</text>
  <!-- main panel (frosted) -->
  <rect x="128" y="44" width="196" height="130" rx="11" fill="url(#frost)" stroke="${hl}" stroke-opacity="0.6"/>
  <text x="142" y="70" font-family="${FONT}" font-size="14" font-weight="700" fill="${c.text}">All saves synced</text>
  <text x="142" y="90" font-family="${FONT}" font-size="11" fill="${c.muted}">Last backup · 2m ago</text>
  <text x="142" y="106" font-family="${FONT}" font-size="11" fill="${c.muted}">12 slots · 1.2 GB</text>
  <line x1="142" y1="118" x2="310" y2="118" stroke="${hl}" stroke-opacity="0.35"/>
  <rect x="142" y="130" width="84" height="26" rx="9" fill="url(#glassBtn)" stroke="${hl}" stroke-opacity="0.8" filter="url(#glow)"/>
  <text x="184" y="147" font-family="${FONT}" font-size="11" font-weight="600" fill="${onAccent}" text-anchor="middle">Sync now</text>
  <circle cx="250" cy="143" r="5" fill="${ok}"/>
  <circle cx="272" cy="143" r="5" fill="${warn}"/>
  <circle cx="294" cy="143" r="5" fill="${err}"/>
</svg>
`;
}

// --- neumorphism ------------------------------------------------------------
function neoSvg(theme) {
  const c = theme.colors;
  const fx = theme.effects;
  const bg = c.bg;
  const accent = c.accent;
  const ok = c.ok ?? accent;
  const warn = c.warn ?? accent;
  const err = c.err ?? accent;
  const onAccent = onColor(accent);
  const name = esc(theme.name);

  const blur = fx.blur ?? 4;
  const hl = fx.highlight ?? lighten(bg, 0.6);
  const sh = fx.shadow ?? darken(bg, 0.28);
  const d = blur; // shadow offset tracks softness
  const { defs: bubDefs, layer: bubLayer } = bubbleParts(
    !!fx.bubbles,
    fx.bubbleColor ?? fx.highlight ?? accent
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190" viewBox="0 0 340 190" role="img" aria-label="${name} theme preview">
  <title>${name} theme preview (neumorphism)</title>
  <defs>
    <filter id="raised" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="b"/>
      <feOffset in="b" dx="${d}" dy="${d}" result="do"/>
      <feFlood flood-color="${sh}" result="dc"/>
      <feComposite in="dc" in2="do" operator="in" result="dark"/>
      <feOffset in="b" dx="-${d}" dy="-${d}" result="lo"/>
      <feFlood flood-color="${hl}" result="lc"/>
      <feComposite in="lc" in2="lo" operator="in" result="light"/>
      <feMerge>
        <feMergeNode in="dark"/>
        <feMergeNode in="light"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="accentBtn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lighten(accent, 0.14)}"/>
      <stop offset="1" stop-color="${darken(accent, 0.1)}"/>
    </linearGradient>${bubDefs}
  </defs>
  <rect x="0.5" y="0.5" width="339" height="189" rx="14" fill="${bg}" stroke="${c.border}"/>${bubLayer}
  <!-- window controls -->
  <circle cx="22" cy="24" r="5" fill="${err}"/>
  <circle cx="40" cy="24" r="5" fill="${warn}"/>
  <circle cx="58" cy="24" r="5" fill="${ok}"/>
  <text x="78" y="28" font-family="${FONT}" font-size="12" font-weight="600" fill="${c.text}">${name}</text>
  <!-- sidebar (raised, same material as bg) -->
  <rect x="16" y="46" width="104" height="126" rx="16" fill="${bg}" filter="url(#raised)"/>
  <rect x="24" y="56" width="88" height="22" rx="11" fill="url(#accentBtn)" filter="url(#raised)"/>
  <text x="35" y="71" font-family="${FONT}" font-size="11" font-weight="600" fill="${onAccent}">Library</text>
  <text x="33" y="97" font-family="${FONT}" font-size="11" fill="${c.muted}">Saves</text>
  <text x="33" y="117" font-family="${FONT}" font-size="11" fill="${c.muted}">Cloud</text>
  <text x="33" y="137" font-family="${FONT}" font-size="11" fill="${c.muted}">History</text>
  <text x="33" y="157" font-family="${FONT}" font-size="11" fill="${c.muted}">Settings</text>
  <!-- main panel (raised) -->
  <rect x="130" y="46" width="194" height="126" rx="16" fill="${bg}" filter="url(#raised)"/>
  <text x="144" y="72" font-family="${FONT}" font-size="14" font-weight="700" fill="${c.text}">All saves synced</text>
  <text x="144" y="92" font-family="${FONT}" font-size="11" fill="${c.muted}">Last backup · 2m ago</text>
  <text x="144" y="108" font-family="${FONT}" font-size="11" fill="${c.muted}">12 slots · 1.2 GB</text>
  <rect x="144" y="130" width="86" height="27" rx="13" fill="url(#accentBtn)" filter="url(#raised)"/>
  <text x="187" y="148" font-family="${FONT}" font-size="11" font-weight="600" fill="${onAccent}" text-anchor="middle">Sync now</text>
  <circle cx="252" cy="143" r="5" fill="${ok}"/>
  <circle cx="274" cy="143" r="5" fill="${warn}"/>
  <circle cx="296" cy="143" r="5" fill="${err}"/>
</svg>
`;
}

// --- skeuomorphism ----------------------------------------------------------
function skeuoSvg(theme) {
  const c = theme.colors;
  const fx = theme.effects;
  const accent = c.accent;
  const ok = c.ok ?? accent;
  const warn = c.warn ?? accent;
  const err = c.err ?? accent;
  const onAccent = onColor(accent);
  const name = esc(theme.name);

  const grad = fx.gradient ?? [lighten(c.bg, 0.14), c.bg, darken(c.bg, 0.1)];
  const hl = fx.highlight ?? lighten(c.panel, 0.4);
  const sh = fx.shadow ?? darken(c.bg, 0.45);
  const panelTop = lighten(c.panel, 0.16);
  const panelBot = darken(c.panel, 0.12);
  const { defs: bubDefs, layer: bubLayer } = bubbleParts(!!fx.bubbles, fx.bubbleColor ?? hl);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190" viewBox="0 0 340 190" role="img" aria-label="${name} theme preview">
  <title>${name} theme preview (skeuomorphism)</title>
  <defs>
    <linearGradient id="mat" x1="0" y1="0" x2="0" y2="1">${gradStops(grad)}</linearGradient>
    <linearGradient id="panelMat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${panelTop}"/>
      <stop offset="0.5" stop-color="${c.panel}"/>
      <stop offset="1" stop-color="${panelBot}"/>
    </linearGradient>
    <linearGradient id="btnMat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lighten(accent, 0.32)}"/>
      <stop offset="0.5" stop-color="${accent}"/>
      <stop offset="1" stop-color="${darken(accent, 0.2)}"/>
    </linearGradient>
    <filter id="drop" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="${sh}" flood-opacity="0.55"/></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0"/>
    </filter>
    <clipPath id="card"><rect x="0.5" y="0.5" width="339" height="189" rx="14"/></clipPath>${bubDefs}
  </defs>
  <rect x="0.5" y="0.5" width="339" height="189" rx="14" fill="url(#mat)" stroke="${darken(c.border, 0.1)}"/>
  <g clip-path="url(#card)"><rect x="0" y="0" width="340" height="190" filter="url(#grain)"/></g>${bubLayer}
  <!-- window controls (glossy) -->
  <circle cx="22" cy="24" r="5" fill="${err}"/><circle cx="20.5" cy="22" r="1.8" fill="#ffffff" opacity="0.55"/>
  <circle cx="40" cy="24" r="5" fill="${warn}"/><circle cx="38.5" cy="22" r="1.8" fill="#ffffff" opacity="0.55"/>
  <circle cx="58" cy="24" r="5" fill="${ok}"/><circle cx="56.5" cy="22" r="1.8" fill="#ffffff" opacity="0.55"/>
  <text x="78" y="29" font-family="${FONT}" font-size="12" font-weight="700" fill="${hl}" opacity="0.6">${name}</text>
  <text x="78" y="28" font-family="${FONT}" font-size="12" font-weight="700" fill="${c.text}">${name}</text>
  <!-- sidebar (beveled material) -->
  <rect x="16" y="44" width="104" height="130" rx="10" fill="url(#panelMat)" stroke="${darken(c.border, 0.15)}" filter="url(#drop)"/>
  <rect x="17.5" y="45.5" width="101" height="127" rx="9" fill="none" stroke="${hl}" stroke-opacity="0.5"/>
  <rect x="24" y="56" width="88" height="22" rx="7" fill="url(#btnMat)" stroke="${darken(accent, 0.3)}"/>
  <rect x="25.5" y="57.5" width="85" height="9" rx="4.5" fill="#ffffff" opacity="0.2"/>
  <text x="34" y="71" font-family="${FONT}" font-size="11" font-weight="700" fill="${onAccent}">Library</text>
  <text x="33" y="97" font-family="${FONT}" font-size="11" fill="${c.muted}">Saves</text>
  <text x="33" y="117" font-family="${FONT}" font-size="11" fill="${c.muted}">Cloud</text>
  <text x="33" y="137" font-family="${FONT}" font-size="11" fill="${c.muted}">History</text>
  <text x="33" y="157" font-family="${FONT}" font-size="11" fill="${c.muted}">Settings</text>
  <!-- main panel (beveled material) -->
  <rect x="128" y="44" width="196" height="130" rx="10" fill="url(#panelMat)" stroke="${darken(c.border, 0.15)}" filter="url(#drop)"/>
  <rect x="129.5" y="45.5" width="193" height="127" rx="9" fill="none" stroke="${hl}" stroke-opacity="0.5"/>
  <text x="142" y="71" font-family="${FONT}" font-size="14" font-weight="800" fill="${hl}" opacity="0.55">All saves synced</text>
  <text x="142" y="70" font-family="${FONT}" font-size="14" font-weight="800" fill="${c.text}">All saves synced</text>
  <text x="142" y="90" font-family="${FONT}" font-size="11" fill="${c.muted}">Last backup · 2m ago</text>
  <text x="142" y="106" font-family="${FONT}" font-size="11" fill="${c.muted}">12 slots · 1.2 GB</text>
  <line x1="142" y1="118" x2="310" y2="118" stroke="${darken(c.border, 0.1)}"/>
  <line x1="142" y1="119" x2="310" y2="119" stroke="${hl}" stroke-opacity="0.4"/>
  <rect x="142" y="130" width="86" height="27" rx="8" fill="url(#btnMat)" stroke="${darken(accent, 0.3)}" filter="url(#drop)"/>
  <rect x="144" y="132" width="82" height="10" rx="5" fill="#ffffff" opacity="0.22"/>
  <text x="185" y="148" font-family="${FONT}" font-size="11" font-weight="700" fill="${onAccent}" text-anchor="middle">Sync now</text>
  <circle cx="252" cy="143" r="5" fill="${ok}"/><circle cx="250.5" cy="141" r="1.8" fill="#ffffff" opacity="0.55"/>
  <circle cx="274" cy="143" r="5" fill="${warn}"/><circle cx="272.5" cy="141" r="1.8" fill="#ffffff" opacity="0.55"/>
  <circle cx="296" cy="143" r="5" fill="${err}"/><circle cx="294.5" cy="141" r="1.8" fill="#ffffff" opacity="0.55"/>
</svg>
`;
}

function svgFor(theme) {
  switch (theme.effects?.style) {
    case "glass":
      return glassSvg(theme);
    case "neo":
      return neoSvg(theme);
    case "skeuo":
      return skeuoSvg(theme);
    default:
      return flatSvg(theme);
  }
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
