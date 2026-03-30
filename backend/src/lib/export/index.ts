/**
 * Export task result to formatted JSON
 */
export function exportToJson(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Escape CSV value - handles commas, quotes, and newlines
 */
function escapeCsvValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export task result to CSV format
 */
export function exportToCsv(data: Record<string, unknown>): string {
  const headers = Object.keys(data);
  const values = headers.map(key => {
    const value = data[key];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return escapeCsvValue(JSON.stringify(value));
    return escapeCsvValue(String(value));
  });

  return [headers.join(','), values.join(',')].join('\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Export task result to XML format
 */
export function exportToXml(data: Record<string, unknown>): string {
  const fields = Object.entries(data)
    .map(([key, value]) => {
      const stringValue =
        value === null || value === undefined
          ? ''
          : typeof value === 'object'
            ? escapeXml(JSON.stringify(value))
            : escapeXml(String(value));
      return `  <${key}>${stringValue}</${key}>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<invoice>\n${fields}\n</invoice>`;
}
