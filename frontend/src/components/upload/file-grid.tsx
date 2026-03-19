import type { FileItem } from '@frontend/lib/file-state';
import { FileCard } from './file-card';

interface FileGridProps {
  files: FileItem[];
  onRemove: (id: string) => void;
}

export function FileGrid({ files, onRemove }: FileGridProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8" data-testid="file-grid">
      {files.map(file => (
        <FileCard item={file} key={file.id} onRemove={onRemove} />
      ))}
    </div>
  );
}
