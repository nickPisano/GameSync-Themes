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

const effectsSchema = schema.properties.effects;
const effectsRequired = effectsSchema.required ?? [];
const effectsAllowed = Object.keys(effectsSchema.properties);

// Schema-driven check for a single value against its property definition.
// Covers exactly the JSON Schema features the schema uses: the hex $ref,
// enums, numbers with min/max, and arrays of those. Keeps the validator
// dependency-free while still treating the schema as the source of truth.
function checkField(path, value, spec, errors) {
  if (spec.$ref === "#/$defs/hex") {
    if (typeof value !== "string" || !hexPattern.test(value)) {
      errors.push(`${path}: "${value}" is not a #rrggbb hex value`);
    }
    return;
  }
  if (spec.enum) {
    if (!spec.enum.includes(value)) {
      errors.push(`${path}: "${value}" is not one of: ${spec.enum.join(", ")}`);
    }
    return;
  }
  switch (spec.type) {
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push(`${path}: must be a number`);
      } else if (spec.minimum !== undefined && value < spec.minimum) {
        errors.push(`${path}: must be ≥ ${spec.minimum} (got ${value})`);
      } else if (spec.maximum !== undefined && value > spec.maximum) {
        errors.push(`${path}: must be ≤ ${spec.maximum} (got ${value})`);
      }
      break;
    case "array":
      if (!Array.isArray(value)) {
        errors.push(`${path}: must be an array`);
        break;
      }
      if (spec.minItems !== undefined && value.length < spec.minItems) {
        errors.push(`${path}: needs at least ${spec.minItems} items`);
      }
      if (spec.maxItems !== undefined && value.length > spec.maxItems) {
        errors.push(`${path}: allows at most ${spec.maxItems} items`);
      }
      value.forEach((v, i) => checkField(`${path}[${i}]`, v, spec.items, errors));
      break;
    case "string":
      if (typeof value !== "string") errors.push(`${path}: must be a string`);
      break;
    case "boolean":
      if (typeof value !== "boolean") errors.push(`${path}: must be true or false`);
      break;
  }
}

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

  // effects (optional)
  if ("effects" in data) {
    const fx = data.effects;
    if (typeof fx !== "object" || fx === null || Array.isArray(fx)) {
      errors.push(`"effects" must be an object`);
    } else {
      for (const key of effectsRequired) {
        if (!(key in fx)) errors.push(`effects: missing required key "${key}"`);
      }
      for (const [key, value] of Object.entries(fx)) {
        if (!effectsAllowed.includes(key)) {
          errors.push(`effects: unknown key "${key}"`);
          continue;
        }
        checkField(`effects.${key}`, value, effectsSchema.properties[key], errors);
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
