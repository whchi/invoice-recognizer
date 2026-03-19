import { createId } from '@paralleldrive/cuid2';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { templates } from './templates';

export const tasks = sqliteTable('tasks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id'),
  r2Key: text('r2_key').notNull(),
  templateId: text('template_id').references(() => templates.id),
  status: text('status').notNull().default('queued'), // queued | processing | completed | failed
  idempotencyKey: text('idempotency_key').unique(),
  errorCode: text('error_code'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdateFn(() => new Date()),
});

export const taskResults = sqliteTable('task_results', {
  taskId: text('task_id')
    .primaryKey()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  result: text('result').notNull(), // validated JSON as text
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
