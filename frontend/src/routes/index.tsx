import { ActionBar } from '@frontend/components/upload/action-bar';
import { DisclaimerCheckbox } from '@frontend/components/upload/disclaimer-checkbox';
import { DropZone } from '@frontend/components/upload/drop-zone';
import { FileGrid } from '@frontend/components/upload/file-grid';
import { TemplateSelector } from '@frontend/components/upload/template-selector';
import { useUpload } from '@frontend/hooks/use-upload';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/')({
  component: UploadPage,
});

function UploadPage() {
  const { files, addFiles, removeFile, isUploading, startUpload } = useUpload();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [templateId, setTemplateId] = useState<string>('');

  const handleUpload = () => {
    startUpload({ disclaimerAccepted, templateId });
  };

  return (
    <div className="container max-w-5xl py-8 mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Extract Data from Invoices</h1>
        <p className="text-muted-foreground">
          Upload your invoices and receipts to automatically extract structured data.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <DropZone disabled={isUploading} onFilesAdded={addFiles} />
        </div>

        <div className="space-y-6">
          <TemplateSelector disabled={isUploading} onChange={setTemplateId} value={templateId} />
          <DisclaimerCheckbox checked={disclaimerAccepted} disabled={isUploading} onChange={setDisclaimerAccepted} />
        </div>
      </div>

      <FileGrid files={files} onRemove={removeFile} />

      <ActionBar files={files} isUploading={isUploading} onUpload={handleUpload} uploadDisabled={!disclaimerAccepted} />
    </div>
  );
}
