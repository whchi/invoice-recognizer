import { ActionBar } from '@frontend/components/upload/action-bar';
import { DisclaimerCheckbox } from '@frontend/components/upload/disclaimer-checkbox';
import { DropZone } from '@frontend/components/upload/drop-zone';
import { FileGrid } from '@frontend/components/upload/file-grid';
import { TemplateSelector } from '@frontend/components/upload/template-selector';
import { useUpload } from '@frontend/hooks/use-upload';
import { createFileRoute } from '@tanstack/react-router';
import { Shield, Sparkles, Zap } from 'lucide-react';
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
    <div className="min-h-full bg-background">
      {/* Asymmetric Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 border-b border-border/50">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-[1400px] mx-auto px-6 py-12 lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 animate-pulse-soft">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Extraction
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 leading-[1.1]">
              Extract data from invoices in seconds
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              Upload your invoices, receipts, and financial documents. Our AI automatically extracts structured data
              with 99.2% accuracy.
            </p>
          </div>
        </div>

        {/* Decorative gradient orb */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 -right-10 w-64 h-64 bg-primary/3 rounded-full blur-2xl" />
      </div>

      {/* Main Content Area - Asymmetric Grid */}
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
          {/* Left Column - Upload Area */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Upload Documents</h2>
              <p className="text-sm text-muted-foreground">Drag and drop or browse to select files</p>
            </div>

            <DropZone disabled={isUploading} onFilesAdded={addFiles} />

            {files.length > 0 && <FileGrid files={files} onRemove={removeFile} />}

            {files.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  { icon: Zap, label: 'Lightning Fast', desc: 'Process in under 10s' },
                  { icon: Shield, label: 'Bank-Grade Secure', desc: 'Enterprise encryption' },
                  { icon: Sparkles, label: 'AI-Powered', desc: '99.2% accuracy' },
                ].map((feature, i) => (
                  <div
                    key={feature.label}
                    className="group flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all duration-300"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="p-2 rounded-lg bg-background shadow-sm ring-1 ring-border/50 group-hover:ring-primary/30 group-hover:shadow-md transition-all duration-300">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{feature.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Configuration */}
          <div className="space-y-6 lg:pt-0">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Configuration</h2>
              <p className="text-sm text-muted-foreground">Set extraction options</p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-background border border-border/50 shadow-sm">
                <TemplateSelector disabled={isUploading} onChange={setTemplateId} value={templateId} />
              </div>

              <div className="p-5 rounded-xl bg-background border border-border/50 shadow-sm">
                <DisclaimerCheckbox
                  checked={disclaimerAccepted}
                  disabled={isUploading}
                  onChange={setDisclaimerAccepted}
                />
              </div>

              {/* Stats Card */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-foreground">This Month</span>
                  <span className="text-xs text-muted-foreground">March 2026</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">247</p>
                    <p className="text-xs text-muted-foreground">Documents processed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">99.2%</p>
                    <p className="text-xs text-muted-foreground">Accuracy rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <ActionBar
          files={files}
          isUploading={isUploading}
          onUpload={handleUpload}
          uploadDisabled={!disclaimerAccepted}
        />
      </div>
    </div>
  );
}
