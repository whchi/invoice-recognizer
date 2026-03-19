import { describe, it, expect } from 'vitest';
import { buildGeminiPrompt, parseGeminiJson, validateAgainstTemplate, LEGACY_TAIWAN_FIELDS } from '../index';

describe('buildGeminiPrompt', () => {
  const legacyFields = [...LEGACY_TAIWAN_FIELDS];

  it("returns legacy Taiwan userPrompt containing '統一發票'", () => {
    const { userPrompt } = buildGeminiPrompt(legacyFields);
    expect(userPrompt).toContain('統一發票');
  });

  it("returns legacy Taiwan systemPrompt containing 'Taiwan'", () => {
    const { systemPrompt } = buildGeminiPrompt(legacyFields);
    expect(systemPrompt).toContain('Taiwan');
  });

  it('returns generic userPrompt containing both custom field names', () => {
    const { userPrompt } = buildGeminiPrompt(['vendor_name', 'total']);
    expect(userPrompt).toContain('vendor_name');
    expect(userPrompt).toContain('total');
  });

  it('does NOT return legacy Taiwan content for custom fields', () => {
    const { userPrompt } = buildGeminiPrompt(['vendor_name', 'total']);
    expect(userPrompt).not.toContain('統一發票');
  });

  it("returns generic userPrompt containing 'Return ONLY valid JSON'", () => {
    const { userPrompt } = buildGeminiPrompt(['vendor_name', 'total']);
    expect(userPrompt).toContain('Return ONLY valid JSON');
  });

  it('uses systemOverride when provided for legacy fields', () => {
    const override = 'Custom system prompt';
    const { systemPrompt } = buildGeminiPrompt(legacyFields, override);
    expect(systemPrompt).toBe(override);
  });

  it('uses systemOverride when provided for custom fields', () => {
    const override = 'Custom system prompt';
    const { systemPrompt } = buildGeminiPrompt(['amount'], override);
    expect(systemPrompt).toBe(override);
  });

  it('uses default generic systemPrompt for non-legacy fields', () => {
    const { systemPrompt } = buildGeminiPrompt(['amount']);
    expect(systemPrompt).toContain('expert Financial Document Parser');
    expect(systemPrompt).not.toContain('Taiwan');
  });
});

describe('parseGeminiJson', () => {
  it('parses valid raw JSON string', () => {
    const result = parseGeminiJson('{"is_invoice": "yes"}');
    expect(result).toEqual({ ok: true, data: { is_invoice: 'yes' } });
  });

  it('parses markdown-wrapped JSON', () => {
    const input = '```json\n{"amount": "100"}\n```';
    const result = parseGeminiJson(input);
    expect(result).toEqual({ ok: true, data: { amount: '100' } });
  });

  it('parses markdown-wrapped JSON without language tag', () => {
    const input = '```\n{"amount": "100"}\n```';
    const result = parseGeminiJson(input);
    expect(result).toEqual({ ok: true, data: { amount: '100' } });
  });

  it('returns error for invalid JSON string', () => {
    const result = parseGeminiJson('not json at all');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('model_invalid_json');
      expect(result.detail).toBeTruthy();
    }
  });

  it('returns error for JSON array', () => {
    const result = parseGeminiJson('[1,2]');
    expect(result).toEqual({
      ok: false,
      error: 'model_invalid_json',
      detail: 'expected plain object',
    });
  });

  it('returns error for null JSON', () => {
    const result = parseGeminiJson('null');
    expect(result).toEqual({
      ok: false,
      error: 'model_invalid_json',
      detail: 'expected plain object',
    });
  });

  it('parses whitespace-padded valid JSON', () => {
    const result = parseGeminiJson('  \n  {"key": "value"}  \n  ');
    expect(result).toEqual({ ok: true, data: { key: 'value' } });
  });

  it('returns error for empty string', () => {
    const result = parseGeminiJson('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('model_invalid_json');
    }
  });
});

describe('validateAgainstTemplate', () => {
  const fields = ['amount', 'currency', 'vendor_name'];

  it('returns ok with validated data when keys match exactly and values are strings', () => {
    const data = { amount: '100', currency: 'TWD', vendor_name: 'Acme' };
    const result = validateAgainstTemplate(data, fields);
    expect(result).toEqual({
      ok: true,
      validated: { amount: '100', currency: 'TWD', vendor_name: 'Acme' },
    });
  });

  it('returns failure with missing fields', () => {
    const data = { amount: '100' };
    const result = validateAgainstTemplate(data, fields);
    expect(result).toEqual({
      ok: false,
      error: 'model_schema_mismatch',
      missing: ['currency', 'vendor_name'],
      extra: [],
    });
  });

  it('returns failure with extra fields', () => {
    const data = { amount: '100', currency: 'TWD', vendor_name: 'Acme', tax: '5' };
    const result = validateAgainstTemplate(data, fields);
    expect(result).toEqual({
      ok: false,
      error: 'model_schema_mismatch',
      missing: [],
      extra: ['tax'],
    });
  });

  it('returns failure with both missing and extra fields', () => {
    const data = { amount: '100', tax: '5' };
    const result = validateAgainstTemplate(data, fields);
    expect(result).toEqual({
      ok: false,
      error: 'model_schema_mismatch',
      missing: ['currency', 'vendor_name'],
      extra: ['tax'],
    });
  });

  it('returns failure when a value is not a string', () => {
    const data = { amount: 100, currency: 'TWD', vendor_name: 'Acme' };
    const result = validateAgainstTemplate(data, fields);
    expect(result).toEqual({
      ok: false,
      error: 'model_schema_mismatch',
      missing: [],
      extra: [],
    });
  });

  it('returns failure for null input', () => {
    const result = validateAgainstTemplate(null, fields);
    expect(result).toEqual({
      ok: false,
      error: 'model_schema_mismatch',
      missing: [...fields],
      extra: [],
    });
  });

  it('returns failure for array input', () => {
    const result = validateAgainstTemplate([1, 2], fields);
    expect(result).toEqual({
      ok: false,
      error: 'model_schema_mismatch',
      missing: [...fields],
      extra: [],
    });
  });

  it('returns ok for empty fields with empty object', () => {
    const result = validateAgainstTemplate({}, []);
    expect(result).toEqual({ ok: true, validated: {} });
  });

  it('returns failure when non-string primitive input', () => {
    const result = validateAgainstTemplate(42, ['a']);
    expect(result).toEqual({
      ok: false,
      error: 'model_schema_mismatch',
      missing: ['a'],
      extra: [],
    });
  });

  it('returns failure when value is boolean instead of string', () => {
    const data = { amount: '100', currency: true, vendor_name: 'Acme' };
    const result = validateAgainstTemplate(data, fields);
    expect(result).toEqual({
      ok: false,
      error: 'model_schema_mismatch',
      missing: [],
      extra: [],
    });
  });

  it('handles empty string values as valid strings', () => {
    const data = { amount: '', currency: '', vendor_name: '' };
    const result = validateAgainstTemplate(data, fields);
    expect(result).toEqual({
      ok: true,
      validated: { amount: '', currency: '', vendor_name: '' },
    });
  });
});
