import { describe, expect, it } from 'vitest';
import { exportToCsv, exportToJson, exportToXml } from '../index';

describe('exportToJson', () => {
  const mockTaskResult = {
    invoice_number: 'AB-12345678',
    amount: 1500,
    date: '2024-01-15',
    vendor: 'Test Store',
  };

  it('returns formatted JSON with proper indentation', () => {
    const result = exportToJson(mockTaskResult);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(mockTaskResult);
  });

  it('handles nested objects', () => {
    const nested = {
      invoice: { number: 'AB-12345678', amount: 1500 },
      vendor: { name: 'Test Store', tax_id: '12345678' },
    };
    const result = exportToJson(nested);
    const parsed = JSON.parse(result);
    expect(parsed.invoice.number).toBe('AB-12345678');
  });
});

describe('exportToCsv', () => {
  const mockTaskResult = {
    invoice_number: 'AB-12345678',
    amount: 1500,
    date: '2024-01-15',
    vendor: 'Test Store',
  };

  it('returns CSV with headers and values', () => {
    const result = exportToCsv(mockTaskResult);
    expect(result).toContain('invoice_number,amount,date,vendor');
    expect(result).toContain('AB-12345678,1500,2024-01-15,Test Store');
  });

  it('handles values with commas by quoting', () => {
    const withComma = { description: 'Item, with comma', amount: 100 };
    const result = exportToCsv(withComma);
    expect(result).toContain('"Item, with comma"');
  });

  it('handles values with quotes by escaping', () => {
    const withQuote = { description: 'Item "quoted"', amount: 100 };
    const result = exportToCsv(withQuote);
    expect(result).toContain('"Item ""quoted"""');
  });
});

describe('exportToXml', () => {
  const mockTaskResult = {
    invoice_number: 'AB-12345678',
    amount: 1500,
    date: '2024-01-15',
    vendor: 'Test Store',
  };

  it('returns valid XML structure', () => {
    const result = exportToXml(mockTaskResult);
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result).toContain('<invoice>');
    expect(result).toContain('<invoice_number>AB-12345678</invoice_number>');
    expect(result).toContain('</invoice>');
  });

  it('escapes XML special characters', () => {
    const withSpecial = { description: 'Item <with> & "special" chars', amount: 100 };
    const result = exportToXml(withSpecial);
    expect(result).toContain('&lt;with&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;special&quot;');
  });
});
