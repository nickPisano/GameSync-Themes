#!/usr/bin/env node
// Regenerates themes/index.json, a catalog of every theme in themes/.
// Each entry is { id, name, file, accent, bg }, sorted by id.
//
// Usage:
//   node scripts/generate-index.mjs           Write themes/index.json
//   node scripts/generate-index.mjs --check    Verify it is up to date (CI)

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(root, "themes");
const indexPath = join(themesDir, "index.json");

const checkOnly = process.argv.includes("--check");

const files = readdirSync(themesDir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort();

const themes = files.map((file) => {
  const data = JSON.parse(readFileSync(join(themesDir, file), "utf8"));
  return {
    id: file.replace(/\.json$/, ""),
    name: data.name,
    file,
    accent: data.colors.accent,
    bg: data.colors.bg,
  };
});

const output = JSON.stringify({ themes }, null, 2) + "\n";

if (checkOnly) {
  let current = "";
  try {
    current = readFileSync(indexPath, "utf8");
  } catch {
    /* missing file => treated as out of date below */
  }
  if (current !== output) {
    console.error(
      "themes/index.json is out of date. Run `npm run index` and commit the result."
    );
    process.exit(1);
  }
  console.log(`themes/index.json is up to date (${themes.length} themes).`);
} else {
  writeFileSync(indexPath, output);
  console.log(`Wrote themes/index.json with ${themes.length} themes.`);
}
