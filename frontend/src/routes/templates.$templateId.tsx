import { TemplateEditor } from '@frontend/components/templates/template-editor';
import { getTemplate, type Template } from '@frontend/lib/api';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/templates/$templateId')({
  component: TemplateEditorPage,
});
function TemplateEditorPage() {
  const { templateId } = Route.useParams();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const data = await getTemplate(templateId);
        setTemplate(data);
      } catch (error) {
        console.error('Failed to fetch template:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplate();
  }, [templateId]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return <div>Template not found</div>;
  }

  return (
    <div className="space-y-6">
      <TemplateEditor template={template} mode="edit" />
    </div>
  );
}
