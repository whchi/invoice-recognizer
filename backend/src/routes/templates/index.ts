import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  setDefaultTemplate,
  toggleFavorite,
  updateTemplate,
} from '@backend/lib/templates';
import { requireAuth } from '@backend/middleware/auth';
import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { HTTPException } from 'hono/http-exception';
import {
  CreateTemplateResponseSchema,
  FavoriteResponseSchema,
  OkResponseSchema,
  TemplateListResponseSchema,
  TemplateSchema,
  TemplatesErrorSchema,
} from './schema';

export const templates = new Hono<{ Bindings: Bindings; Variables: Variables }>();

templates.use('*', requireAuth);

templates.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.message === 'Malformed JSON in request body') {
      return c.json({ error: 'invalid_body', message: 'Invalid JSON body.' }, 400);
    }
    return err.getResponse();
  }
  throw err;
});

templates.get(
  '/',
  describeRoute({
    description: 'List all templates.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(TemplateListResponseSchema) } },
        description: 'List of templates',
      },
    },
    summary: 'List templates',
    tags: ['Templates'],
  }),
  async c => {
    const db = c.get('db');
    const all = await listTemplates(db);
    const parsed = all.map(t => ({
      ...t,
      createdAt: t.createdAt?.toISOString() ?? null,
      fields: JSON.parse(t.fields) as string[],
    }));

    return c.json({ templates: parsed }, 200);
  },
);

templates.post(
  '/',
  describeRoute({
    description: 'Create a new template with a name and field list.',
    responses: {
      201: {
        content: { 'application/json': { schema: resolver(CreateTemplateResponseSchema) } },
        description: 'Template created',
      },
      400: {
        content: { 'application/json': { schema: resolver(TemplatesErrorSchema) } },
        description: 'Invalid request',
      },
    },
    summary: 'Create template',
    tags: ['Templates'],
  }),
  async c => {
    let body: { name?: string; fields?: string[] };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_body', message: 'Invalid JSON body.' }, 400);
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return c.json({ error: 'validation', message: 'Name is required.' }, 400);
    }

    if (!Array.isArray(body.fields)) {
      return c.json({ error: 'validation', message: 'Fields must be an array of strings.' }, 400);
    }

    const userId = c.get('user')?.id;
    const db = c.get('db');
    const result = await createTemplate(db, {
      createdBy: userId,
      fields: body.fields,
      name: body.name.trim(),
    });

    if (!result.ok) {
      return c.json({ error: 'validation', message: result.errors.join('; ') }, 400);
    }

    return c.json({ id: result.id }, 201);
  },
);

templates.get(
  '/:id',
  describeRoute({
    description: 'Get a template by ID.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(TemplateSchema) } },
        description: 'Template details',
      },
      404: {
        content: { 'application/json': { schema: resolver(TemplatesErrorSchema) } },
        description: 'Template not found',
      },
    },
    summary: 'Get template',
    tags: ['Templates'],
  }),
  async c => {
    const id = c.req.param('id');
    const db = c.get('db');
    const template = await getTemplate(db, id);

    if (!template) {
      return c.json({ error: 'not_found', message: 'Template not found.' }, 404);
    }

    return c.json(
      {
        ...template,
        createdAt: template.createdAt?.toISOString() ?? null,
        fields: JSON.parse(template.fields) as string[],
      },
      200,
    );
  },
);

templates.put(
  '/:id',
  describeRoute({
    description: 'Update a template by ID.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(OkResponseSchema) } },
        description: 'Template updated',
      },
      400: {
        content: { 'application/json': { schema: resolver(TemplatesErrorSchema) } },
        description: 'Validation error',
      },
      404: {
        content: { 'application/json': { schema: resolver(TemplatesErrorSchema) } },
        description: 'Template not found',
      },
    },
    summary: 'Update template',
    tags: ['Templates'],
  }),
  async c => {
    let body: { name?: string; fields?: string[] };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_body', message: 'Invalid JSON body.' }, 400);
    }

    const id = c.req.param('id');
    const db = c.get('db');
    const result = await updateTemplate(db, id, {
      fields: body.fields,
      name: body.name,
    });

    if (!result.ok) {
      if (result.errors.includes('template not found')) {
        return c.json({ error: 'validation', message: result.errors.join('; ') }, 404);
      }
      return c.json({ error: 'validation', message: result.errors.join('; ') }, 400);
    }

    return c.json({ ok: true }, 200);
  },
);

templates.delete(
  '/:id',
  describeRoute({
    description: 'Delete a template by ID.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(OkResponseSchema) } },
        description: 'Template deleted',
      },
      400: {
        content: { 'application/json': { schema: resolver(TemplatesErrorSchema) } },
        description: 'Validation error',
      },
      404: {
        content: { 'application/json': { schema: resolver(TemplatesErrorSchema) } },
        description: 'Template not found',
      },
    },
    summary: 'Delete template',
    tags: ['Templates'],
  }),
  async c => {
    const id = c.req.param('id');
    const db = c.get('db');
    const result = await deleteTemplate(db, id);

    if (!result.ok) {
      if (result.errors.includes('template not found')) {
        return c.json({ error: 'validation', message: result.errors.join('; ') }, 404);
      }
      return c.json({ error: 'validation', message: result.errors.join('; ') }, 400);
    }

    return c.json({ ok: true }, 200);
  },
);

templates.post(
  '/:id/favorite',
  describeRoute({
    description: 'Toggle favorite status for a template.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(FavoriteResponseSchema) } },
        description: 'Favorite toggled',
      },
      404: {
        content: { 'application/json': { schema: resolver(TemplatesErrorSchema) } },
        description: 'Template not found',
      },
    },
    summary: 'Toggle favorite',
    tags: ['Templates'],
  }),
  async c => {
    const userId = c.get('user')?.id;
    const id = c.req.param('id');
    const db = c.get('db');
    const result = await toggleFavorite(db, userId!, id);

    if (!result.ok) {
      return c.json({ error: 'validation', message: result.errors.join('; ') }, 404);
    }

    return c.json({ favorited: result.favorited, ok: true }, 200);
  },
);

templates.post(
  '/:id/default',
  describeRoute({
    description: 'Set a template as the default.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(OkResponseSchema) } },
        description: 'Default template set',
      },
      404: {
        content: { 'application/json': { schema: resolver(TemplatesErrorSchema) } },
        description: 'Template not found',
      },
    },
    summary: 'Set default template',
    tags: ['Templates'],
  }),
  async c => {
    const userId = c.get('user')?.id;
    const id = c.req.param('id');
    const db = c.get('db');
    const result = await setDefaultTemplate(db, userId!, id);

    if (!result.ok) {
      return c.json({ error: 'validation', message: result.errors.join('; ') }, 404);
    }

    return c.json({ ok: true }, 200);
  },
);
