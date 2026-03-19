import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@frontend/components/ui/tabs';

export function ApiDocs() {
  return (
    <div className="space-y-6" data-testid="code-snippets">
      <div>
        <h2 className="text-lg font-medium">API Documentation</h2>
        <p className="text-sm text-muted-foreground">
          Learn how to integrate with our API using your preferred language.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            Authenticate your API requests by including your API key in the Authorization header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
            Authorization: Bearer YOUR_API_KEY
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code Snippets</CardTitle>
          <CardDescription>Examples of how to create a task using our API.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs className="w-full" defaultValue="node">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="node">Node.js</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>
            <TabsContent className="mt-4" value="node">
              <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                <pre>
                  {`const fetch = require('node-fetch');

async function createTask() {
  const response = await fetch('https://api.example.com/v1/tasks', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      r2Key: 'your-file-key.pdf',
      templateId: 'template-123'
    })
  });

  const data = await response.json();
  console.log(data);
}

createTask();`}
                </pre>
              </div>
            </TabsContent>
            <TabsContent className="mt-4" value="python">
              <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                <pre>
                  {`import requests

def create_task():
    url = "https://api.example.com/v1/tasks"

    headers = {
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    }

    payload = {
        "r2Key": "your-file-key.pdf",
        "templateId": "template-123"
    }

    response = requests.post(url, json=payload, headers=headers)
    print(response.json())

create_task()`}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
