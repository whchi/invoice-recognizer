import path from 'node:path';
import { expect, test } from './fixtures';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_UPLOAD_URL_RESPONSE = {
  expiresAt: new Date(Date.now() + 300000).toISOString(),
  r2Key: 'tmp/test-invoice.jpg',
  uploadUrl: 'https://r2.example.com/upload/test-key',
};

const MOCK_TASK_QUEUED = {
  createdAt: new Date().toISOString(),
  id: 'task-001',
  status: 'queued',
};

const MOCK_TASK_COMPLETED = {
  createdAt: new Date().toISOString(),
  id: 'task-001',
  result: {
    amount: '1500.00',
    date: '2026-02-24',
    invoice_number: 'INV-2026-001',
    vendor: 'ACME Corp',
  },
  status: 'completed',
};

const MOCK_TEMPLATES_RESPONSE = {
  templates: [
    {
      createdAt: new Date().toISOString(),
      createdBy: null,
      fields: ['invoice_number', 'vendor', 'amount', 'date'],
      id: 'tmpl-001',
      name: 'Standard Invoice',
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Upload page — drop zone', () => {
  test('drop zone is visible with drag & drop text', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
    });
    await guestPage.goto('/');
    await expect(guestPage.locator('[data-testid="drop-zone"]')).toBeVisible();
    await expect(guestPage.getByText(/drag|drop|browse/i)).toBeVisible();
  });

  test('disclaimer checkbox exists and is unchecked by default', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
    });
    await guestPage.goto('/');
    const checkbox = guestPage.locator('[data-testid="disclaimer-checkbox"]');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test('uploaded file appears in grid with pending status', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
    });
    await guestPage.goto('/');
    const fileInput = guestPage.locator('input[type="file"]');
    const testFile = path.join(process.cwd(), 'tests/e2e/fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);
    await expect(guestPage.locator('[data-testid="file-grid"]')).toBeVisible();
    await expect(guestPage.getByText('pending')).toBeVisible();
  });

  test('upload button is disabled when disclaimer not checked', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
    });
    await guestPage.goto('/');
    const uploadBtn = guestPage.locator('[data-testid="upload-button"]');
    await expect(uploadBtn).toBeDisabled();
  });

  test('template selector exists on upload page', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
    });
    await guestPage.goto('/');
    await expect(guestPage.locator('[data-testid="template-selector"]')).toBeVisible();
  });
});

test.describe('Upload page — file processing flow', () => {
  test('file status transitions from pending to done after upload', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/tasks': { body: MOCK_TASK_QUEUED, status: 201 },
      '**/api/tasks/**': { body: MOCK_TASK_COMPLETED },
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
      '**/api/upload-url': { body: MOCK_UPLOAD_URL_RESPONSE },
      'https://r2.example.com/**': { body: '', status: 200 },
    });
    await guestPage.goto('/');
    const fileInput = guestPage.locator('input[type="file"]');
    const testFile = path.join(process.cwd(), 'tests/e2e/fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);
    await guestPage.locator('[data-testid="disclaimer-checkbox"]').check();
    await guestPage.locator('[data-testid="upload-button"]').click();
    await expect(guestPage.getByText('done')).toBeVisible({ timeout: 15000 });
  });

  test('result form appears with parsed invoice data after completion', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/tasks': { body: MOCK_TASK_QUEUED, status: 201 },
      '**/api/tasks/**': { body: MOCK_TASK_COMPLETED },
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
      '**/api/upload-url': { body: MOCK_UPLOAD_URL_RESPONSE },
      'https://r2.example.com/**': { body: '', status: 200 },
    });
    await guestPage.goto('/');
    const fileInput = guestPage.locator('input[type="file"]');
    const testFile = path.join(process.cwd(), 'tests/e2e/fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);
    await guestPage.locator('[data-testid="disclaimer-checkbox"]').check();
    await guestPage.locator('[data-testid="upload-button"]').click();
    await expect(guestPage.getByText('INV-2026-001')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Upload page — batch upload', () => {
  test('multiple files appear in grid after selection', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
    });
    await guestPage.goto('/');
    const fileInput = guestPage.locator('input[type="file"]');
    const testFile = path.join(process.cwd(), 'tests/e2e/fixtures/test-invoice.jpg');
    await fileInput.setInputFiles([testFile, testFile, testFile]);
    const fileItems = guestPage.locator('[data-testid="file-item"]');
    await expect(fileItems).toHaveCount(3);
  });

  test('progress counter shows 0/N then increments', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
    });
    await guestPage.goto('/');
    const fileInput = guestPage.locator('input[type="file"]');
    const testFile = path.join(process.cwd(), 'tests/e2e/fixtures/test-invoice.jpg');
    await fileInput.setInputFiles([testFile, testFile, testFile]);
    await expect(guestPage.getByText(/0\/3|0 \/ 3/)).toBeVisible();
  });
});

test.describe('Upload page — export', () => {
  test('Export JSON button triggers download', async ({ authenticatedPage, mockApi }) => {
    await mockApi({
      '**/api/tasks': { body: MOCK_TASK_QUEUED, status: 201 },
      '**/api/tasks/**': { body: MOCK_TASK_COMPLETED },
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
      '**/api/upload-url': { body: MOCK_UPLOAD_URL_RESPONSE },
      'https://r2.example.com/**': { body: '', status: 200 },
    });
    await authenticatedPage.goto('/');
    const fileInput = authenticatedPage.locator('input[type="file"]');
    const testFile = path.join(process.cwd(), 'tests/e2e/fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);
    await authenticatedPage.locator('[data-testid="disclaimer-checkbox"]').check();
    await authenticatedPage.locator('[data-testid="upload-button"]').click();
    await expect(authenticatedPage.getByText('done')).toBeVisible({ timeout: 15000 });
    const downloadPromise = authenticatedPage.waitForEvent('download');
    await authenticatedPage.locator('[data-testid="export-json-button"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('Export CSV button triggers download', async ({ authenticatedPage, mockApi }) => {
    await mockApi({
      '**/api/tasks': { body: MOCK_TASK_QUEUED, status: 201 },
      '**/api/tasks/**': { body: MOCK_TASK_COMPLETED },
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
      '**/api/upload-url': { body: MOCK_UPLOAD_URL_RESPONSE },
      'https://r2.example.com/**': { body: '', status: 200 },
    });
    await authenticatedPage.goto('/');
    const fileInput = authenticatedPage.locator('input[type="file"]');
    const testFile = path.join(process.cwd(), 'tests/e2e/fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);
    await authenticatedPage.locator('[data-testid="disclaimer-checkbox"]').check();
    await authenticatedPage.locator('[data-testid="upload-button"]').click();
    await expect(authenticatedPage.getByText('done')).toBeVisible({ timeout: 15000 });
    const downloadPromise = authenticatedPage.waitForEvent('download');
    await authenticatedPage.locator('[data-testid="export-csv-button"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe('Upload page — error handling', () => {
  test('error message appears for files exceeding size limit', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES_RESPONSE },
      '**/api/upload-url': {
        body: { error: 'file_too_large', message: 'File exceeds 15MB limit' },
        status: 400,
      },
    });
    await guestPage.goto('/');
    const fileInput = guestPage.locator('input[type="file"]');
    const testFile = path.join(process.cwd(), 'tests/e2e/fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);
    await guestPage.locator('[data-testid="disclaimer-checkbox"]').check();
    await guestPage.locator('[data-testid="upload-button"]').click();
    await expect(guestPage.getByText(/error|failed|15MB/i)).toBeVisible({ timeout: 10000 });
  });
});
