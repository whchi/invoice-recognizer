import { describe, it, expect } from 'vitest';
import { validateAgainstTemplate, validateFieldNames } from '../validate';

describe('validateAgainstTemplate', () => {
  const fields = ['invoice_number', 'amount', 'currency'];

  it('returns ok with matching keys', () => {
    const result = validateAgainstTemplate({ invoice_number: 'AB-12345678', amount: '1000', currency: 'TWD' }, fields);
    expect(result).toEqual({
      ok: true,
      data: { invoice_number: 'AB-12345678', amount: '1000', currency: 'TWD' },
    });
  });

  it('reports missing keys', () => {
    const result = validateAgainstTemplate({ invoice_number: 'X' }, fields);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.stringContaining('missing: amount, currency'));
    }
  });

  it('reports extra keys', () => {
    const result = validateAgainstTemplate(
      {
        invoice_number: 'X',
        amount: '1',
        currency: 'TWD',
        foo: 'bar',
      },
      fields,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.stringContaining('extra: foo'));
    }
  });

  it('reports both missing and extra keys', () => {
    const result = validateAgainstTemplate({ invoice_number: 'X', foo: 'bar' }, fields);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBe(2);
      expect(result.errors[0]).toContain('missing:');
      expect(result.errors[1]).toContain('extra:');
    }
  });

  it('coerces non-string values to strings', () => {
    const result = validateAgainstTemplate({ invoice_number: 123, amount: true, currency: null }, fields);
    expect(result).toEqual({
      ok: true,
      data: { invoice_number: '123', amount: 'true', currency: 'null' },
    });
  });

  it('rejects null input', () => {
    const result = validateAgainstTemplate(null, fields);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('input must be a plain object');
    }
  });

  it('rejects array input', () => {
    const result = validateAgainstTemplate([1, 2], fields);
    expect(result.ok).toBe(false);
  });

  it('rejects non-object input', () => {
    const result = validateAgainstTemplate('string', fields);
    expect(result.ok).toBe(false);
  });

  it('accepts empty fields with empty object', () => {
    const result = validateAgainstTemplate({}, []);
    expect(result).toEqual({ ok: true, data: {} });
  });

  it('requires EXACTLY matching keys — no subset allowed', () => {
    const result = validateAgainstTemplate({ invoice_number: 'X', amount: '1' }, fields);
    expect(result.ok).toBe(false);
  });

  it('requires EXACTLY matching keys — no superset allowed', () => {
    const result = validateAgainstTemplate(
      {
        invoice_number: 'X',
        amount: '1',
        currency: 'TWD',
        extra_field: 'y',
      },
      fields,
    );
    expect(result.ok).toBe(false);
  });
});

describe('validateFieldNames', () => {
  it('accepts valid field names', () => {
    const result = validateFieldNames(['amount', 'currency', 'invoice_number']);
    expect(result.ok).toBe(true);
  });

  it('rejects empty fields array', () => {
    const result = validateFieldNames([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('at least 1 field is required');
    }
  });

  it('rejects field names starting with number', () => {
    const result = validateFieldNames(['1field']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain('invalid field name');
    }
  });

  it('rejects field names starting with underscore', () => {
    const result = validateFieldNames(['_field']);
    expect(result.ok).toBe(false);
  });

  it('rejects uppercase letters', () => {
    const result = validateFieldNames(['Amount']);
    expect(result.ok).toBe(false);
  });

  it('rejects spaces in field names', () => {
    const result = validateFieldNames(['field name']);
    expect(result.ok).toBe(false);
  });

  it('rejects hyphens in field names', () => {
    const result = validateFieldNames(['field-name']);
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate field names', () => {
    const result = validateFieldNames(['amount', 'amount']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.stringContaining('duplicate field name: "amount"'));
    }
  });

  it('rejects more than 30 fields', () => {
    const fields = Array.from({ length: 31 }, (_, i) => `field${i}`);
    const result = validateFieldNames(fields);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.stringContaining('maximum 30 fields'));
    }
  });

  it('accepts exactly 30 fields', () => {
    const fields = Array.from({ length: 30 }, (_, i) => `field${i}`);
    const result = validateFieldNames(fields);
    expect(result.ok).toBe(true);
  });

  it('accepts single-char field names', () => {
    const result = validateFieldNames(['a', 'b', 'c']);
    expect(result.ok).toBe(true);
  });

  it('accepts field names with numbers after first char', () => {
    const result = validateFieldNames(['field1', 'field2a', 'x99']);
    expect(result.ok).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const result = validateFieldNames(['Amount', '1field', 'amount', 'amount']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });
});
