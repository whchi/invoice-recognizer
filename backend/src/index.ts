import { getDb } from '@backend/db';
import { getAuth, sessionMiddleware } from '@backend/middleware/auth';
import { admin } from '@backend/routes/admin';
import { apiKeys } from '@backend/routes/api-keys';
import { credits } from '@backend/routes/credits';
import { tasks } from '@backend/routes/tasks';
import { templates } from '@backend/routes/templates';
import { uploadUrl } from '@backend/routes/upload-url';
import type { Bindings, Variables } from '@backend/types';
import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { openAPIRouteHandler } from 'hono-openapi';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use(
  cors({
    origin: ['http://localhost:5173'],
    allowMethods: ['*'],
    credentials: true,
  }),
);
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// DB middleware — instantiate per-request
const dbMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const db = getDb(c.env);
  c.set('db', db);
  await next();
});

// Apply DB middleware globally
app.use('*', dbMiddleware);

// better-auth route handler
app.on(['POST', 'GET'], '/api/auth/**', c => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

// Session middleware — resolve user/session for all routes
app.use('*', sessionMiddleware);

// Route sub-apps
app.route('/api/tasks', tasks);
app.route('/api/templates', templates);
app.route('/api/credits', credits);
app.route('/api/api-keys', apiKeys);
app.route('/api/admin', admin);
app.route('/api/upload-url', uploadUrl);

// OpenAPI documentation
app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'billboard-backend API',
        description: 'API documentation for my application',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/',
          description: 'Current server',
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'api-key',
          },
          JwtAuth: {
            type: 'http',
            scheme: 'bearer',
          },
          ClerkUserAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'clerk-session-token',
          },
        },
      },
    },
    excludeMethods: ['OPTIONS'],
    excludeTags: ['internal'],
  }),
);

app.get(
  '/docs',
  Scalar({
    theme: 'saturn',
    url: '/openapi.json',
  }),
);
