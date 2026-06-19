#!/usr/bin/env node
// Validates every theme file in themes/ against schema/theme.schema.json.
// Zero dependencies: the schema is the source of truth, and this script
// enforces the parts of it that matter for themes (required keys, allowed
// keys, #rrggbb hex values, and the name length limit).
//
// Usage: node scripts/validate.mjs
// Exit code 0 = all valid, 1 = one or more files failed.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(root, "themes");
const schemaPath = join(root, "schema", "theme.schema.json");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const topRequired = schema.required;
const topAllowed = Object.keys(schema.properties);
const nameMax = schema.properties.name.maxLength;

const colorSchema = schema.properties.colors;
const colorRequired = colorSchema.required;
const colorAllowed = Object.keys(colorSchema.properties);
const hexPattern = new RegExp(schema.$defs.hex.pattern);

let totalErrors = 0;
let fileCount = 0;

const files = readdirSync(themesDir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort();

if (files.length === 0) {
  console.error("No theme files found in themes/");
  process.exit(1);
}

for (const file of files) {
  fileCount++;
  const errors = [];
  const path = join(themesDir, file);
  let data;

  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    report(file, [`invalid JSON: ${e.message}`]);
    totalErrors++;
    continue;
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    report(file, ["root must be a JSON object"]);
    totalErrors++;
    continue;
  }

  // Top-level keys
  for (const key of topRequired) {
    if (!(key in data)) errors.push(`missing required key "${key}"`);
  }
  for (const key of Object.keys(data)) {
    if (!topAllowed.includes(key)) errors.push(`unknown key "${key}"`);
  }

  // name
  if ("name" in data) {
    if (typeof data.name !== "string") {
      errors.push(`"name" must be a string`);
    } else {
      if (data.name.length === 0) errors.push(`"name" must not be empty`);
      if (data.name.length > nameMax)
        errors.push(`"name" exceeds ${nameMax} chars (got ${data.name.length})`);
    }
  }

  // colors
  if ("colors" in data) {
    const colors = data.colors;
    if (typeof colors !== "object" || colors === null || Array.isArray(colors)) {
      errors.push(`"colors" must be an object`);
    } else {
      for (const key of colorRequired) {
        if (!(key in colors)) errors.push(`colors: missing required key "${key}"`);
      }
      for (const [key, value] of Object.entries(colors)) {
        if (!colorAllowed.includes(key)) {
          errors.push(`colors: unknown key "${key}"`);
          continue;
        }
        if (typeof value !== "string" || !hexPattern.test(value)) {
          errors.push(`colors.${key}: "${value}" is not a #rrggbb hex value`);
        }
      }
    }
  }

  if (errors.length > 0) {
    report(file, errors);
    totalErrors += errors.length;
  } else {
    console.log(`  ok   ${file}`);
  }
}

function report(file, errors) {
  console.log(`  FAIL ${file}`);
  for (const e of errors) console.log(`       - ${e}`);
}

console.log("");
if (totalErrors > 0) {
  console.error(`Validation failed: ${totalErrors} error(s) across ${fileCount} file(s).`);
  process.exit(1);
}
console.log(`All ${fileCount} theme(s) valid.`);
