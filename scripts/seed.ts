import { drizzle } from 'drizzle-orm/better-sqlite3';
import { reset, seed } from 'drizzle-seed';
import * as schema from '../backend/src/db/schema';

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

  console.log('Seed complete.');
  console.log(`  Users:      ${SEED_COUNT.users}`);
  console.log(`  Templates:  ${SEED_COUNT.templates}`);
  console.log(`  Tasks:      ${SEED_COUNT.tasks}`);
  console.log(`  API Keys:   ${SEED_COUNT.users * SEED_COUNT.apiKeysPerUser}`);
  console.log(`  Wallets:    ${SEED_COUNT.users}`);
  console.log('');
  console.log('NOTE: Admin user must be created via sign-up API.');
  console.log('      POST /api/auth/sign-up/email with:');
  console.log("        { email: 'admin@cc.cc', password: 'Aa123456', name: 'Admin User' }");
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
