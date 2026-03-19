import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@frontend/components/ui/select';
import { listTemplates, type Template } from '@frontend/lib/api';
import { useEffect, useState } from 'react';

interface TemplateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TemplateSelector({ value, onChange, disabled = false }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchTemplates() {
      try {
        setIsLoading(true);
        const response = await listTemplates();
        if (mounted) {
          setTemplates(response.templates);
          // Auto-select first template if none selected
          if (!value && response.templates.length > 0) {
            onChange(response.templates[0].id);
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load templates');
          console.error(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTemplates();

    return () => {
      mounted = false;
    };
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <label
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        htmlFor="template-select"
      >
        Extraction Template
      </label>
      <Select disabled={disabled || isLoading || templates.length === 0} onValueChange={onChange} value={value}>
        <SelectTrigger className="w-full sm:w-[300px]" data-testid="template-selector" id="template-select">
          <SelectValue placeholder={isLoading ? 'Loading templates...' : 'Select a template'} />
        </SelectTrigger>
        <SelectContent>
          {templates.map(template => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {templates.length === 0 && !isLoading && !error && (
        <p className="text-xs text-muted-foreground">No templates available.</p>
      )}
    </div>
  );
}
