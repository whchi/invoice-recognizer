const FIELD_NAME_REGEX = /^[a-z][a-z0-9_]*$/;
const MAX_FIELDS = 30;

export type ValidationSuccess = { ok: true; data: Record<string, string> };
export type ValidationFailure = { ok: false; errors: string[] };
export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateAgainstTemplate(obj: unknown, fields: string[]): ValidationResult {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: ['input must be a plain object'] };
  }

  const record = obj as Record<string, unknown>;
  const objKeys = new Set(Object.keys(record));
  const fieldSet = new Set(fields);
  const errors: string[] = [];

  const missing = fields.filter(f => !objKeys.has(f));
  if (missing.length > 0) {
    errors.push(`missing: ${missing.join(', ')}`);
  }

  const extra = Object.keys(record).filter(k => !fieldSet.has(k));
  if (extra.length > 0) {
    errors.push(`extra: ${extra.join(', ')}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const data: Record<string, string> = {};
  for (const key of fields) {
    const val = record[key];
    data[key] = typeof val === 'string' ? val : String(val);
  }

  return { ok: true, data };
}

export function validateFieldNames(fields: string[]): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (fields.length === 0) {
    errors.push('at least 1 field is required');
  }
  if (fields.length > MAX_FIELDS) {
    errors.push(`maximum ${MAX_FIELDS} fields allowed`);
  }

  const seen = new Set<string>();
  for (const f of fields) {
    if (!FIELD_NAME_REGEX.test(f)) {
      errors.push(`invalid field name "${f}": must match [a-z][a-z0-9_]*`);
    }
    if (seen.has(f)) {
      errors.push(`duplicate field name: "${f}"`);
    }
    seen.add(f);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
