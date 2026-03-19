import { Alert, AlertDescription, AlertTitle } from '@frontend/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@frontend/components/ui/alert-dialog';
import { Button } from '@frontend/components/ui/button';
import { Card, CardContent } from '@frontend/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@frontend/components/ui/dialog';
import { Input } from '@frontend/components/ui/input';
import { Label } from '@frontend/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@frontend/components/ui/table';
import { type ApiKey, type CreateApiKeyResponse, createApiKey, deleteApiKey, listApiKeys } from '@frontend/lib/api';
import { AlertTriangle, Copy, Key, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ApiKeyList() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const data = await listApiKeys();
      setKeys(data.keys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setIsCreating(true);
      const response = await createApiKey(newKeyName);
      setCreatedKey(response);
      setNewKeyName('');
      fetchKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await deleteApiKey(id);
      fetchKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const closeCreateDialog = () => {
    setIsCreateOpen(false);
    setCreatedKey(null);
    setNewKeyName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">API Keys</h2>
          <p className="text-sm text-muted-foreground">Manage your API keys for authenticating requests to the API.</p>
        </div>
        <Dialog
          onOpenChange={open => {
            if (!open) closeCreateDialog();
            else setIsCreateOpen(true);
          }}
          open={isCreateOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {!createdKey ? (
              <form onSubmit={handleCreateKey}>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new API key to help you identify it later.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      autoFocus
                      data-testid="api-key-name-input"
                      id="keyName"
                      name="keyName"
                      onChange={e => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production Key"
                      value={newKeyName}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={closeCreateDialog} type="button" variant="outline">
                    Cancel
                  </Button>
                  <Button disabled={!newKeyName.trim() || isCreating} type="submit">
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>Your new API key has been created successfully.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Alert className="bg-destructive/10 text-destructive border-destructive/20" variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important!</AlertTitle>
                    <AlertDescription>
                      This key won't be shown again. Please copy it and store it securely.
                    </AlertDescription>
                  </Alert>
                  <div className="flex items-center space-x-2">
                    <code className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm font-mono">
                      {createdKey.fullKey}
                    </code>
                    <Button
                      aria-label="Copy API Key"
                      onClick={() => copyToClipboard(createdKey.fullKey)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={closeCreateDialog} type="button">
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-muted-foreground" colSpan={4}>
                    Loading API keys...
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-muted-foreground" colSpan={4}>
                    No API keys found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map(key => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span>{key.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {key.prefix}••••••••••••••••
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid="api-key-created-at">
                      {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            data-testid="revoke-key-button"
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove the key "{key.name}"? This action cannot be undone and any
                              applications using this key will immediately lose access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleRevokeKey(key.id)}
                            >
                              Remove Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
