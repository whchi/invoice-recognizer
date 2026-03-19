import { Badge } from '@frontend/components/ui/badge';
import { Button } from '@frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@frontend/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { Input } from '@frontend/components/ui/input';
import { Label } from '@frontend/components/ui/label';
import { createTemplate, type Template, updateTemplate } from '@frontend/lib/api';
import { useNavigate } from '@tanstack/react-router';
import { Loader2, Plus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TemplateEditorProps {
  template?: Template;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel;
  isDialog?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TemplateEditor({
  template,
  mode,
  onSuccess,
  onCancel,
  isDialog = false,
  open,
  onOpenChange,
}: TemplateEditorProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(template?.name ?? '');
  const [fields, setFields] = useState<string[]>(template?.fields ?? ['invoice_number', 'date', 'total']);
  const [newField, setNewField] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setFields(template.fields);
    }
  }, [template]);

  const [isPending, setIsPending] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsPending(true);
    try {
      if (mode === 'create') {
        const res = await createTemplate(name, fields);
        if (onSuccess) onSuccess({ id: res.id, name, fields, createdAt: new Date().toISOString(), createdBy: null });
        if (isDialog && onOpenChange) onOpenChange(false);
        setName('');
        setFields(['invoice_number', 'date', 'total']);
      } else if (template) {
        await updateTemplate(template.id, name, fields);
        if (onSuccess) onSuccess({ ...template, name, fields });
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsPending(false);
    }
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (newField.trim() && !fields.includes(newField.trim())) {
      setFields([...fields, newField.trim()]);
      setNewField('');
    }
  };

  const handleRemoveField = (fieldToRemove: string) => {
    setFields(fields.filter(f => f !== fieldToRemove));
  };

  const content = (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="templateName">Template Name</Label>
        <Input
          data-testid="template-name-input"
          id="templateName"
          name="templateName"
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Standard Invoice"
          value={name}
        />
      </div>

      <div className="space-y-4">
        <Label>Fields to Extract</Label>
        <div className="flex flex-wrap gap-2 rounded-md border p-4 min-h-[100px] bg-muted/20">
          {fields.length === 0 ? (
            <span className="text-sm text-muted-foreground">No fields added yet.</span>
          ) : (
            fields.map(field => (
              <Badge className="flex items-center gap-1 px-2 py-1 text-sm" key={field} variant="secondary">
                {field}
                <button
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                  onClick={() => handleRemoveField(field)}
                  type="button"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {field}</span>
                </button>
              </Badge>
            ))
          )}
        </div>

        <form className="flex gap-2" onSubmit={handleAddField}>
          <Input
            onChange={e => setNewField(e.target.value)}
            placeholder="Add a new field (e.g. vendor_name)"
            value={newField}
          />
          <Button type="submit" variant="secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </form>
      </div>
    </div>
  );

  if (isDialog) {
    return (
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create Template' : 'Edit Template'}</DialogTitle>
            <DialogDescription>Define the fields you want to extract from your invoices.</DialogDescription>
          </DialogHeader>
          {content}
          <DialogFooter>
            <Button onClick={() => onOpenChange?.(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={isPending || !name.trim()} onClick={handleSave}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Create Template' : 'Edit Template'}</CardTitle>
        <CardDescription>Define the fields you want to extract from your invoices.</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={() => navigate({ to: '/templates' })} variant="outline">
          Cancel
        </Button>
        <Button disabled={isPending || !name.trim()} onClick={handleSave}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}
