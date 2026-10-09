// A small JSON Schema validator: enough of draft 2020-12 for our own schema
// (type, const, enum, required, properties, additionalProperties, items,
// pattern, minLength, maxLength, minimum, $ref to #/$defs, format date-time).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SCHEMA_PATH = fileURLToPath(new URL('../schema/decisions.schema.json', import.meta.url));

export function loadSchema() {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}

function typeMatches(v, t) {
  const actual = typeOf(v);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function validate(value, schema, root = schema, path = '$', errors = []) {
  if (schema.$ref) {
    const name = schema.$ref.replace(/^#\/\$defs\//, '');
    return validate(value, root.$defs[name], root, path, errors);
  }
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(value, t))) { errors.push(`${path}: expected ${types.join('|')}, got ${typeOf(value)}`); return errors; }
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.maxLength != null && value.length > schema.maxLength) errors.push(`${path}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${path}: does not match ${schema.pattern}`);
    if (schema.format === 'date-time' && !DATE_TIME.test(value)) errors.push(`${path}: not an RFC 3339 date-time`);
  }
  if (typeof value === 'number' && schema.minimum != null && value < schema.minimum) errors.push(`${path}: below ${schema.minimum}`);
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => validate(v, schema.items, root, `${path}[${i}]`, errors));
  if (typeOf(value) === 'object') {
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${path}: missing "${key}"`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) validate(v, props[k], root, `${path}.${k}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}: unknown property "${k}"`);
    }
  }
  return errors;
}

/** Schema errors plus semantic checks the schema cannot express. */
export function validateLedger(ledger, schema = loadSchema()) {
  const errors = validate(ledger, schema);
  if (errors.length) return errors;
  const ids = new Set();
  ledger.decisions.forEach((d, i) => {
    const p = `$.decisions[${i}]`;
    if (ids.has(d.id)) errors.push(`${p}.id: duplicate id "${d.id}"`);
    ids.add(d.id);
    const optIds = new Set(d.options.map((o) => o.id));
    if (optIds.size !== d.options.length) errors.push(`${p}.options: duplicate option ids`);
    if (d.default != null && !optIds.has(d.default)) errors.push(`${p}.default: "${d.default}" is not an option id`);
    if (d.chosen != null && d.chosen !== 'other' && !optIds.has(d.chosen)) errors.push(`${p}.chosen: "${d.chosen}" is not an option id`);
    if (d.status === 'answered' && d.chosen == null) errors.push(`${p}: status "answered" needs "chosen"`);
    if (d.status === 'default' && (d.chosen ?? null) !== (d.default ?? null)) errors.push(`${p}: status "default" must keep chosen == default`);
    if (d.chosen === 'other' && !d.other) errors.push(`${p}.other: required when chosen is "other"`);
  });
  return errors;
}
