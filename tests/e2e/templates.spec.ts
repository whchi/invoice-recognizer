import { expect, test } from './fixtures';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TEMPLATES = {
  templates: [
    {
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      fields: ['invoice_number', 'vendor', 'amount', 'date'],
      id: 'tmpl-001',
      name: 'Standard Invoice',
    },
    {
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      fields: ['vendor', 'amount', 'date'],
      id: 'tmpl-002',
      name: 'Receipt Template',
    },
  ],
};

// ─── Templates list page ──────────────────────────────────────────────────────

test.describe('Templates — list page', () => {
  test('page title "Templates" is visible', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/templates': { body: MOCK_TEMPLATES } });
    await authenticatedPage.goto('/templates');
    await expect(authenticatedPage.getByRole('heading', { name: /templates/i })).toBeVisible();
  });

  test('Create Template button exists', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/templates': { body: MOCK_TEMPLATES } });
    await authenticatedPage.goto('/templates');
    await expect(authenticatedPage.getByRole('button', { name: /create template/i })).toBeVisible();
  });

  test('template cards render from API data', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/templates': { body: MOCK_TEMPLATES } });
    await authenticatedPage.goto('/templates');
    await expect(authenticatedPage.getByText('Standard Invoice')).toBeVisible();
    await expect(authenticatedPage.getByText('Receipt Template')).toBeVisible();
  });

  test('favorite star toggle exists on template card', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/templates': { body: MOCK_TEMPLATES } });
    await authenticatedPage.goto('/templates');
    await expect(authenticatedPage.locator('[data-testid="favorite-toggle"]').first()).toBeVisible();
  });
});

// ─── Create template flow ─────────────────────────────────────────────────────

test.describe('Templates — create flow', () => {
  test('clicking Create Template opens creation form', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/templates': { body: MOCK_TEMPLATES } });
    await authenticatedPage.goto('/templates');
    await authenticatedPage.getByRole('button', { name: /create template/i }).click();
    await expect(
      authenticatedPage.locator('input[name="templateName"], [data-testid="template-name-input"]'),
    ).toBeVisible();
  });

  test('new template appears in list after creation', async ({ authenticatedPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES },
      '**/api/templates POST': { body: { id: 'tmpl-003' }, status: 201 },
    });
    await authenticatedPage.goto('/templates');
    await authenticatedPage.getByRole('button', { name: /create template/i }).click();
    await authenticatedPage
      .locator('input[name="templateName"], [data-testid="template-name-input"]')
      .fill('Test Invoice Template');
    await authenticatedPage.getByRole('button', { name: /save|create/i }).click();
    await expect(authenticatedPage.getByText('Test Invoice Template')).toBeVisible({ timeout: 5000 });
  });
});

// ─── Edit template flow ───────────────────────────────────────────────────────

test.describe('Templates — edit flow', () => {
  test('clicking a template opens edit form pre-filled with data', async ({ authenticatedPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: MOCK_TEMPLATES },
      '**/api/templates/tmpl-001': {
        body: MOCK_TEMPLATES.templates[0],
      },
    });
    await authenticatedPage.goto('/templates');
    await authenticatedPage.getByText('Standard Invoice').click();
    const nameInput = authenticatedPage.locator('input[name="templateName"], [data-testid="template-name-input"]');
    await expect(nameInput).toHaveValue('Standard Invoice');
  });
});

// ─── Delete template ──────────────────────────────────────────────────────────

test.describe('Templates — delete', () => {
  test('delete button triggers confirmation dialog', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/templates': { body: MOCK_TEMPLATES } });
    await authenticatedPage.goto('/templates');
    await authenticatedPage.locator('[data-testid="delete-template-button"]').first().click();
    await expect(authenticatedPage.getByRole('alertdialog')).toBeVisible();
  });
});
