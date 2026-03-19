import type { TaskResponse } from '@frontend/lib/api';

/**
 * Download data as a file in the browser using a temporary anchor element.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export an array of task results as a JSON file download.
 */
export function exportAsJson(results: TaskResponse[]): void {
  const data = results.map(r => r.result ?? { id: r.id, status: r.status });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `invoice-results-${Date.now()}.json`);
}

/**
 * Export an array of task results as a CSV file download.
 * Only the specified fields are included as columns.
 */
export function exportAsCsv(results: TaskResponse[], fields: string[]): void {
  const rows: string[] = [];

  // Header row
  rows.push(fields.map(f => JSON.stringify(f)).join(','));

  // Data rows
  for (const task of results) {
    const resultData = (task.result ?? {}) as Record<string, unknown>;
    const row = fields.map(field => {
      const val = resultData[field];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return JSON.stringify(val);
      return String(val);
    });
    rows.push(row.join(','));
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `invoice-results-${Date.now()}.csv`);
}
