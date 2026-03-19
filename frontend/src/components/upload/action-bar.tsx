import { Button } from '@frontend/components/ui/button';
import type { FileItem } from '@frontend/lib/file-state';
import { FileJson, FileSpreadsheet, Upload } from 'lucide-react';

interface ActionBarProps {
  files: FileItem[];
  isUploading: boolean;
  onUpload: () => void;
  uploadDisabled: boolean;
}

export function ActionBar({ files, isUploading, onUpload, uploadDisabled }: ActionBarProps) {
  const doneFiles = files.filter(f => f.status === 'done');
  const pendingFiles = files.filter(f => f.status === 'pending');
  const totalFiles = files.length;
  const handleExportJson = () => {
    const results = doneFiles.map(f => ({
      filename: f.file.name,
      ...f.result?.result,
    }));

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (doneFiles.length === 0) return;

    // Get all unique keys from all results
    const allKeys = new Set<string>(['filename']);
    doneFiles.forEach(f => {
      if (f.result?.result) {
        Object.keys(f.result.result).forEach(k => {
          allKeys.add(k);
        });
      }
    });

    const headers = Array.from(allKeys);

    const rows = doneFiles.map(f => {
      const row: Record<string, string> = { filename: f.file.name };
      if (f.result?.result) {
        Object.entries(f.result.result).forEach(([k, v]) => {
          row[k] = String(v).replace(/"/g, '""'); // Escape quotes
        });
      }
      return headers.map(h => `"${row[h] || ''}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card border rounded-xl shadow-sm mt-8 sticky bottom-4 z-10">
      <div className="flex items-center gap-4">
        {totalFiles > 0 && (
          <div className="text-sm font-medium">
            <span className="text-muted-foreground">Progress: </span>
            <span className="text-foreground">
              {doneFiles.length}/{totalFiles}
            </span>
          </div>
        )}
        {isUploading && (
          <div className="text-sm text-blue-500 animate-pulse flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Processing...
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        {doneFiles.length > 0 && (
          <>
            <Button
              className="flex-1 sm:flex-none"
              data-testid="export-json-button"
              onClick={handleExportJson}
              size="sm"
              variant="outline"
            >
              <FileJson className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              data-testid="export-csv-button"
              onClick={handleExportCsv}
              size="sm"
              variant="outline"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </>
        )}

        <Button
          className="flex-1 sm:flex-none min-w-[120px]"
          data-testid="upload-button"
          disabled={uploadDisabled || pendingFiles.length === 0 || isUploading}
          onClick={onUpload}
        >
          {isUploading ? (
            'Uploading...'
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload {pendingFiles.length > 0 ? `(${pendingFiles.length})` : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
