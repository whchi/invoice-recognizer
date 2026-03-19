import { Badge } from '@frontend/components/ui/badge';
import { Button } from '@frontend/components/ui/button';
import { Card, CardContent } from '@frontend/components/ui/card';
import { Progress } from '@frontend/components/ui/progress';
import type { FileItem, FileStatus } from '@frontend/lib/file-state';
import { AlertCircle, CheckCircle2, FileText, FileWarning, Loader2, XCircle } from 'lucide-react';

interface FileCardProps {
  item: FileItem;
  onRemove: (id: string) => void;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case 'pending':
      return <FileText className="w-5 h-5 text-muted-foreground" />;
    case 'uploading':
    case 'analyzing':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'uploaded':
      return <FileText className="w-5 h-5 text-blue-500" />;
    case 'done':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    case 'not-invoice':
      return <FileWarning className="w-5 h-5 text-orange-500" />;
    default:
      return <FileText className="w-5 h-5 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: FileStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">pending</Badge>;
    case 'uploading':
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600" variant="default">
          uploading
        </Badge>
      );
    case 'uploaded':
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600" variant="default">
          uploaded
        </Badge>
      );
    case 'analyzing':
      return (
        <Badge className="bg-purple-500 hover:bg-purple-600" variant="default">
          analyzing
        </Badge>
      );
    case 'done':
      return (
        <Badge className="bg-green-500 hover:bg-green-600" variant="default">
          done
        </Badge>
      );
    case 'error':
      return <Badge variant="destructive">error</Badge>;
    case 'not-invoice':
      return (
        <Badge className="text-orange-500 border-orange-500" variant="outline">
          not-invoice
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function FileCard({ item, onRemove }: FileCardProps) {
  const isProcessing = item.status === 'uploading' || item.status === 'analyzing';
  const isDone = item.status === 'done' || item.status === 'error' || item.status === 'not-invoice';

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md" data-testid="file-item">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            <StatusIcon status={item.status} />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate" title={item.file.name}>
                {item.file.name}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={item.status} />
                {!isProcessing && (
                  <Button
                    aria-label="Remove file"
                    className="w-6 h-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatBytes(item.file.size)}</span>
              {isProcessing && <span>{item.progress}%</span>}
            </div>

            {(isProcessing || isDone) && (
              <Progress
                className={`h-1.5 mt-2 ${
                  item.status === 'error'
                    ? 'bg-destructive/20 [&>div]:bg-destructive'
                    : item.status === 'done'
                      ? 'bg-green-500/20 [&>div]:bg-green-500'
                      : item.status === 'not-invoice'
                        ? 'bg-orange-500/20 [&>div]:bg-orange-500'
                        : ''
                }`}
                value={item.progress}
              />
            )}

            {item.error && (
              <p className="text-xs text-destructive mt-2 line-clamp-2" title={item.error}>
                {item.error}
              </p>
            )}

            {item.status === 'done' && item.result?.result && (
              <div className="mt-3 p-2 bg-muted/50 rounded-md text-xs space-y-1">
                {Object.entries(item.result.result)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div className="flex justify-between gap-2" key={key}>
                      <span className="text-muted-foreground truncate">{key}:</span>
                      <span className="font-medium truncate">{String(value)}</span>
                    </div>
                  ))}
                {Object.keys(item.result.result).length > 3 && (
                  <div className="text-muted-foreground text-center pt-1">
                    +{Object.keys(item.result.result).length - 3} more fields
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
