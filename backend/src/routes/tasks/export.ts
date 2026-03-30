import { taskResults, tasks } from '@backend/db/schema';
import { exportToCsv, exportToJson, exportToXml } from '@backend/lib/export';
import { authenticateRequest } from '@backend/middleware/auth';
import type { Bindings, Variables } from '@backend/types';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { ExportQuerySchema, ExportResponseSchema } from './schema';

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

    // Fetch task with authorization check
    const [task] = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        status: tasks.status,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return c.json({ error: 'not_found' }, 404);
    }

    // Authorization: task owner or guest task
    if (task.userId !== null && task.userId !== userId) {
      return c.json({ error: 'forbidden' }, 403);
    }

    // Only allow export of completed tasks
    if (task.status !== 'completed') {
      return c.json({ error: 'task_not_completed' }, 400);
    }

    // Fetch result
    const [resultRow] = await db
      .select({ result: taskResults.result })
      .from(taskResults)
      .where(eq(taskResults.taskId, taskId))
      .limit(1);

    if (!resultRow) {
      return c.json({ error: 'result_not_found' }, 404);
    }

    // Parse and export based on format
    let parsedResult: Record<string, unknown>;
    try {
      parsedResult = JSON.parse(resultRow.result);
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
