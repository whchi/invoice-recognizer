import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@frontend/components/ui/alert-dialog';
import { Badge } from '@frontend/components/ui/badge';
import { Button } from '@frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card';
import { deleteTemplate, listTemplates, toggleFavorite, type Template } from '@frontend/lib/api';
import { useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { FileText, Plus, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TemplateEditor } from './template-editor';

export function TemplateList() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listTemplates();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateSuccess = (newTemplate?: Template) => {
    if (newTemplate) {
      setTemplates(prev => [...prev, newTemplate]);
    } else {
      fetchTemplates();
    }
  };
  const handleDelete = async () => {
    if (templateToDelete) {
      setIsDeleting(true);
      try {
        await deleteTemplate(templateToDelete);
        await fetchTemplates();
        setTemplateToDelete(null);
      } catch (error) {
        console.error('Failed to delete template:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const data = await toggleFavorite(id);
      setFavorites(prev => ({ ...prev, [id]: data.favorited }));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleCardClick = (id: string) => {
    navigate({ params: { templateId: id }, to: '/templates/$templateId' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Manage your invoice extraction templates.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card className="animate-pulse" key={i}>
              <CardHeader className="h-24 bg-muted/50" />
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-xl font-semibold">No templates created</h2>
            <p className="mb-8 mt-2 text-center text-sm font-normal leading-6 text-muted-foreground">
              You don't have any templates yet. Create one to start extracting data from your invoices.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <Card
              className="group relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              key={template.id}
              onClick={() => handleCardClick(template.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1 text-lg">{template.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      data-testid="delete-template-button"
                      onClick={e => {
                        e.stopPropagation();
                        setTemplateToDelete(template.id);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                    <Button
                      className={`h-8 w-8 ${favorites[template.id] ? 'text-yellow-500' : 'text-muted-foreground'}`}
                      data-testid="favorite-toggle"
                      onClick={e => handleToggleFavorite(e, template.id)}
                      size="icon"
                      variant="ghost"
                    >
                      <Star className={`h-4 w-4 ${favorites[template.id] ? 'fill-current' : ''}`} />
                      <span className="sr-only">Toggle favorite</span>
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {template.createdAt ? format(new Date(template.createdAt), 'MMM d, yyyy') : 'Unknown date'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {template.fields.slice(0, 5).map(field => (
                    <Badge className="font-normal" key={field} variant="secondary">
                      {field}
                    </Badge>
                  ))}
                  {template.fields.length > 5 && (
                    <Badge className="font-normal" variant="outline">
                      +{template.fields.length - 5} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog onOpenChange={open => !open && setTemplateToDelete(null)} open={!!templateToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TemplateEditor
        mode="create"
        onOpenChange={setIsCreateOpen}
        open={isCreateOpen}
        isDialog={true}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
