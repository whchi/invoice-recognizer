import { ApiDocs } from '@frontend/components/developer/api-docs';
import { ApiKeyList } from '@frontend/components/developer/api-key-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@frontend/components/ui/tabs';
import { getSession } from '@frontend/lib/api';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dev-center')({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.user) {
      throw redirect({ to: '/login' });
    }
  },
  component: DevCenterPage,
});

function DevCenterPage() {
  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Developer Center</h1>
        <p className="text-muted-foreground mt-2">
          Manage your API keys and view documentation for integrating with our API using Python or Node.js.
        </p>
      </div>

      <Tabs className="w-full" defaultValue="keys">
        <TabsList className="mb-8">
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-0" value="keys">
          <ApiKeyList />
        </TabsContent>
        <TabsContent className="mt-0" value="docs">
          <ApiDocs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
