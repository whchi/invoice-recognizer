import { exportToCsv, exportToJson, exportToXml } from '@backend/lib/export';
import { getTask } from '@backend/lib/tasks';
import { authenticateRequest } from '@backend/middleware/auth';
import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { ExportResponseSchema } from './schema';

export const exportRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

exportRouter.get(
  '/:id/export',
  describeRoute({
    description: 'Export task result in JSON, CSV, or XML format',
    responses: {
      200: {
        content: {
          'application/json': { schema: resolver(ExportResponseSchema) },
          'text/csv': { schema: resolver(ExportResponseSchema) },
          'application/xml': { schema: resolver(ExportResponseSchema) },
        },
        description: 'Exported task result',
      },
      400: {
        description: 'Invalid format or task not completed',
      },
      403: {
        description: 'Forbidden — not task owner',
      },
      404: {
        description: 'Task not found',
      },
    },
    summary: 'Export task result',
    tags: ['Tasks'],
  }),
  async c => {
    const authResult = await authenticateRequest(c);
    const userId = authResult?.userId ?? null;
    const taskId = c.req.param('id');
    const format = c.req.query('format') ?? 'json';
    const db = c.get('db');

    // Validate format
    if (!['json', 'csv', 'xml'].includes(format)) {
      return c.json({ error: 'invalid_format' }, 400);
    }

    // Fetch task using getTask (enables mocking in tests)
    const taskResult = await getTask(taskId, userId, db);

    if (!taskResult.ok) {
      if (taskResult.error === 'not_found') {
        return c.json({ error: 'not_found' }, 404);
      }
      return c.json({ error: 'forbidden' }, 403);
    }

    const task = taskResult.task;

    // Only allow export of completed tasks
    if (task.status !== 'completed') {
      return c.json({ error: 'task_not_completed' }, 400);
    }

    // Check if result exists
    if (!task.result) {
      return c.json({ error: 'result_not_found' }, 404);
    }

    // Parse and export based on format
    let parsedResult: Record<string, unknown>;
    try {
      parsedResult = JSON.parse(task.result);
    } catch {
      return c.json({ error: 'invalid_result_data' }, 500);
    }

    // Generate export based on format
    let exportedData: string;
    let contentType: string;

    switch (format) {
      case 'csv':
        exportedData = exportToCsv(parsedResult);
        contentType = 'text/csv';
        break;
      case 'xml':
        exportedData = exportToXml(parsedResult);
        contentType = 'application/xml';
        break;
      case 'json':
      default:
        exportedData = exportToJson(parsedResult);
        contentType = 'application/json';
        break;
    }

    // Set appropriate headers for download
    const filename = `invoice_${taskId}_${new Date().toISOString().split('T')[0]}.${format}`;
    c.header('Content-Type', contentType);
    c.header('Content-Disposition', `attachment; filename="${filename}"`);

    return c.body(exportedData);
  },
);
