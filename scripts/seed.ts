import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { reset, seed } from 'drizzle-seed';
import * as schema from '../src/db/schema';

const ADMIN_PASSWORD_HASH = bcrypt.hashSync('Aa1234', 10);

const SEED_COUNT = {
  apiKeysPerUser: 1,
  tasks: 20,
  templates: 5,
  users: 3,
};

const TEMPLATE_FIELDS = [
  JSON.stringify(['invoice_number', 'date', 'vendor', 'amount', 'tax', 'total']),
  JSON.stringify(['receipt_number', 'date', 'store', 'items', 'subtotal', 'tax', 'total']),
  JSON.stringify(['po_number', 'date', 'supplier', 'description', 'quantity', 'unit_price', 'total']),
  JSON.stringify(['expense_date', 'category', 'description', 'amount', 'currency']),
  JSON.stringify(['bill_number', 'billing_period', 'due_date', 'amount_due', 'account_number']),
];

const TEMPLATE_NAMES = ['Standard Invoice', 'Retail Receipt', 'Purchase Order', 'Expense Report', 'Utility Bill'];

async function main() {
  const db = drizzle('dev.sqlite');

  console.log('Resetting database...');
  await reset(db, schema);

  console.log('Seeding database...');
  await seed(db, schema).refine(f => ({
    // Auth tables — managed by better-auth, skip
    account: { count: 0 },
    apiKeys: {
      columns: {
        keyHash: f.string({ isUnique: true }),
        keyPrefix: f.string({ isUnique: true }),
        name: f.valuesFromArray({ values: ['dev-key', 'test-key', 'staging-key'] }),
        revokedAt: f.default({ defaultValue: null }),
      },
    },
    creditWallet: {
      columns: {
        balance: f.int({ maxValue: 500, minValue: 10 }),
      },
    },
    redeemCodes: { count: 0 },
    session: { count: 0 },
    taskResults: { count: 0 },
    tasks: {
      columns: {
        errorCode: f.default({ defaultValue: null }),
        idempotencyKey: f.default({ defaultValue: null }),
        r2Key: f.string({ isUnique: true }),
        status: f.valuesFromArray({ values: ['queued', 'processing', 'completed', 'failed'] }),
      },
      count: SEED_COUNT.tasks,
    },
    templates: {
      columns: {
        fields: f.valuesFromArray({ values: TEMPLATE_FIELDS }),
        isSystem: f.int({ maxValue: 1, minValue: 0 }),
        name: f.valuesFromArray({ isUnique: true, values: TEMPLATE_NAMES }),
      },
      count: SEED_COUNT.templates,
    },
    user: {
      columns: {
        defaultTemplateId: f.default({ defaultValue: null }),
        email: f.email(),
        emailVerified: f.default({ defaultValue: false }),
        image: f.default({ defaultValue: null }),
        name: f.fullName(),
      },
      count: SEED_COUNT.users,
      with: {
        apiKeys: SEED_COUNT.apiKeysPerUser,
        creditWallet: 1,
      },
    },
    userDailyUsage: { count: 0 },
    // Junction / usage tables — skip
    userFavoriteTemplates: { count: 0 },
    verification: { count: 0 },
  }));

  // Insert admin user with fixed credentials
  console.log('Creating admin user...');
  const adminId = createId();
  const accountId = createId();
  await db
    .insert(schema.user)
    .values({
      createdAt: new Date(),
      email: 'admin@cc.cc',
      id: adminId,
      name: 'Admin User',
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Create credential account for admin (better-auth stores password in account table)
  await db
    .insert(schema.account)
    .values({
      accountId: 'admin@cc.cc',
      createdAt: new Date(),
      id: accountId,
      password: ADMIN_PASSWORD_HASH,
      providerId: 'credential',
      updatedAt: new Date(),
      userId: adminId,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.creditWallet)
    .values({
      balance: 1000,
      updatedAt: new Date(),
      userId: adminId,
    })
    .onConflictDoNothing();

  console.log('Seed complete.');
  console.log(`  Users:      ${SEED_COUNT.users} + 1 admin`);
  console.log(`  Templates:  ${SEED_COUNT.templates}`);
  console.log(`  Tasks:      ${SEED_COUNT.tasks}`);
  console.log(`  API Keys:   ${SEED_COUNT.users * SEED_COUNT.apiKeysPerUser}`);
  console.log(`  Wallets:    ${SEED_COUNT.users} + 1 admin`);
  console.log('');
  console.log('Admin credentials:');
  console.log('  Email:    admin@cc.cc');
  console.log('  Password: Aa1234');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
