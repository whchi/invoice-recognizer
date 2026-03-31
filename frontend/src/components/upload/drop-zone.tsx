import { FileImage, FileText, FileType, UploadCloud } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export function DropZone({ onFilesAdded, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
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
    <div className="relative group">
      {/* Animated background glow */}
      <div
        className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-xl transition-opacity duration-500 ${
          isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        }`}
      />

      {/* Main drop zone container */}
      <button
        aria-disabled={disabled}
        className={`relative flex flex-col items-center justify-center w-full min-h-[280px] p-8 rounded-2xl transition-all duration-500 overflow-hidden ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-muted/30 border-2 border-dashed border-muted-foreground/20'
            : isDragging
              ? 'bg-primary/5 border-2 border-primary scale-[1.02] shadow-2xl shadow-primary/10'
              : 'bg-background border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/20 spring-transition'
        }`}
        data-testid="drop-zone"
        disabled={disabled}
        onClick={handleClick}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        type="button"
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <input
          accept="image/*,application/pdf"
          className="hidden"
          disabled={disabled}
          multiple
          onChange={handleFileInput}
          ref={fileInputRef}
          type="file"
        />

        {/* Floating icon container with perpetual animation */}
        <div className="relative mb-6">
          <div
            className={`p-5 rounded-2xl transition-all duration-500 ${
              isDragging
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 animate-float'
                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary spring-transition'
            }`}
          >
            <UploadCloud className="w-10 h-10" strokeWidth={1.5} />
          </div>

          {/* Orbiting file icons */}
          {!disabled && !isDragging && (
            <>
              <div className="absolute -top-2 -right-2 p-2 rounded-lg bg-background border border-border/50 shadow-sm animate-float-delayed opacity-60">
                <FileImage className="w-4 h-4 text-muted-foreground" />
              </div>
              <div
                className="absolute -bottom-1 -left-3 p-2 rounded-lg bg-background border border-border/50 shadow-sm animate-float opacity-40"
                style={{ animationDelay: '0.5s' }}
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="absolute top-0 -left-4 p-1.5 rounded-md bg-background border border-border/50 shadow-sm animate-pulse-soft opacity-50">
                <FileType className="w-3 h-3 text-muted-foreground" />
              </div>
            </>
          )}
        </div>

        <div className="relative z-10 text-center space-y-3">
          <p className="text-lg font-semibold tracking-tight text-foreground">Drop your files here</p>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            or <span className="text-primary font-medium underline-offset-4 hover:underline">browse</span> to upload
            invoices, receipts, or documents
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
              PDF
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
              PNG
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
              JPG
            </span>
            <span className="text-xs text-muted-foreground/60">Up to 15MB</span>
          </div>
        </div>
      </button>
    </div>
  );
}
