import { createId } from '@paralleldrive/cuid2';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './better-auth';

export const userDailyUsage = sqliteTable(
  'user_daily_usage',
  {
    userId: text('user_id').notNull(),
    date: text('date').notNull(), // YYYY-MM-DD
    count: integer('count').notNull().default(0),
  },
  table => [primaryKey({ columns: [table.userId, table.date] })],
);

export const creditWallet = sqliteTable('credit_wallet', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdateFn(() => new Date()),
});

export const redeemCodes = sqliteTable('redeem_codes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  codeHash: text('code_hash').notNull().unique(),
  credits: integer('credits').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  redeemedAt: integer('redeemed_at', { mode: 'timestamp' }),
  redeemedBy: text('redeemed_by').references(() => user.id),
});
