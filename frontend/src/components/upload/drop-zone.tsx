import { UploadCloud } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export function DropZone({ onFilesAdded, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesAdded(files);
      }
    },
    [disabled, onFilesAdded],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesAdded(files);
      }
      // Reset input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFilesAdded],
  );

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Drop zone
    // biome-ignore lint/a11y/noStaticElementInteractions: Drop zone
    <div
      aria-disabled={disabled}
      className={`relative flex flex-col items-center justify-center w-full h-64 p-6 border-2 border-dashed rounded-xl transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-muted-foreground/20 bg-muted/10'
          : isDragging
            ? 'border-primary bg-primary/5 cursor-copy'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25 cursor-pointer'
      }`}
      data-testid="drop-zone"
      onClick={handleClick}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        accept="image/*,application/pdf"
        className="hidden"
        disabled={disabled}
        multiple
        onChange={handleFileInput}
        ref={fileInputRef}
        type="file"
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div
          className={`p-4 rounded-full ${isDragging ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
        >
          <UploadCloud className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">
            Drag & drop files here, or <span className="text-primary hover:underline">browse</span>
          </p>
          <p className="text-sm text-muted-foreground">Supports PDF, PNG, JPG, JPEG (up to 15MB)</p>
        </div>
      </div>
    </div>
  );
}
