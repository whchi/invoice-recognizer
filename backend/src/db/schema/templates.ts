import { createId } from '@paralleldrive/cuid2';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './better-auth';
export const templates = sqliteTable('templates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  fields: text('fields').notNull(), // JSON array stored as text
  isSystem: integer('is_system').notNull().default(0),
  createdBy: text('created_by').references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const userFavoriteTemplates = sqliteTable(
  'user_favorite_templates',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.userId, table.templateId] })],
);
