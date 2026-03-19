import { expect, test } from './fixtures';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_API_KEYS = {
  keys: [
    {
      createdAt: new Date().toISOString(),
      id: 'key-001',
      name: 'Production Key',
      prefix: 'inv_prod',
      revokedAt: null,
    },
    {
      createdAt: new Date().toISOString(),
      id: 'key-002',
      name: 'Test Key',
      prefix: 'inv_test',
      revokedAt: null,
    },
  ],
};

// ─── API keys list ────────────────────────────────────────────────────────────

test.describe('Developer Center — API keys list', () => {
  test('Create API Key button exists', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/api-keys': { body: MOCK_API_KEYS } });
    await authenticatedPage.goto('/dev-center');
    await expect(authenticatedPage.getByRole('button', { name: /create api key/i })).toBeVisible();
  });

  test('existing keys are listed with name and masked key prefix', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/api-keys': { body: MOCK_API_KEYS } });
    await authenticatedPage.goto('/dev-center');
    await expect(authenticatedPage.getByText('Production Key')).toBeVisible();
    await expect(authenticatedPage.getByText('inv_prod')).toBeVisible();
    await expect(authenticatedPage.getByText('Test Key')).toBeVisible();
  });

  test('creation date is shown for each key', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/api-keys': { body: MOCK_API_KEYS } });
    await authenticatedPage.goto('/dev-center');
    // At least one date should be visible for the keys
    await expect(authenticatedPage.locator('[data-testid="api-key-created-at"]').first()).toBeVisible();
  });
});

// ─── Create API key ───────────────────────────────────────────────────────────

test.describe('Developer Center — create API key', () => {
  test('clicking Create API Key shows name input form', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/api-keys': { body: MOCK_API_KEYS } });
    await authenticatedPage.goto('/dev-center');
    await authenticatedPage.getByRole('button', { name: /create api key/i }).click();
    await expect(authenticatedPage.locator('input[name="keyName"], [data-testid="api-key-name-input"]')).toBeVisible();
  });

  test('newly created key is displayed with full value and copy button', async ({ authenticatedPage, mockApi }) => {
    await mockApi({
      '**/api/api-keys': { body: MOCK_API_KEYS },
      '**/api/api-keys POST': {
        body: {
          createdAt: new Date().toISOString(),
          fullKey: 'inv_new1abcdefghijklmnop',
          id: 'key-003',
          name: 'New Key',
          prefix: 'inv_new1',
        },
        status: 201,
      },
    });
    await authenticatedPage.goto('/dev-center');
    await authenticatedPage.getByRole('button', { name: /create api key/i }).click();
    await authenticatedPage.locator('input[name="keyName"], [data-testid="api-key-name-input"]').fill('New Key');
    await authenticatedPage.getByRole('button', { name: /create|save/i }).click();
    await expect(authenticatedPage.getByText('inv_new1abcdefghijklmnop')).toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.getByRole('button', { name: /copy/i })).toBeVisible();
  });

  test('"copy now" warning is shown after key creation', async ({ authenticatedPage, mockApi }) => {
    await mockApi({
      '**/api/api-keys': { body: MOCK_API_KEYS },
      '**/api/api-keys POST': {
        body: {
          createdAt: new Date().toISOString(),
          fullKey: 'inv_new1abcdefghijklmnop',
          id: 'key-003',
          name: 'New Key',
          prefix: 'inv_new1',
        },
        status: 201,
      },
    });
    await authenticatedPage.goto('/dev-center');
    await authenticatedPage.getByRole('button', { name: /create api key/i }).click();
    await authenticatedPage.locator('input[name="keyName"], [data-testid="api-key-name-input"]').fill('New Key');
    await authenticatedPage.getByRole('button', { name: /create|save/i }).click();
    await expect(authenticatedPage.getByText(/copy now|won't be shown|shown again/i).first()).toBeVisible({
      timeout: 5000,
    });
  });
});

// ─── Revoke API key ───────────────────────────────────────────────────────────

test.describe('Developer Center — revoke API key', () => {
  test('revoke button triggers confirmation dialog', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/api-keys': { body: MOCK_API_KEYS } });
    await authenticatedPage.goto('/dev-center');
    await authenticatedPage.locator('[data-testid="revoke-key-button"]').first().click();
    await expect(authenticatedPage.getByRole('alertdialog')).toBeVisible();
  });
});

// ─── API docs section ─────────────────────────────────────────────────────────

test.describe('Developer Center — API docs', () => {
  test('code snippets section is visible', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/api-keys': { body: MOCK_API_KEYS } });
    await authenticatedPage.goto('/dev-center');
    await expect(
      authenticatedPage.locator('[data-testid="code-snippets"]').or(authenticatedPage.getByText(/python|node/i)),
    ).toBeVisible();
  });

  test('Python code example is shown', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/api-keys': { body: MOCK_API_KEYS } });
    await authenticatedPage.goto('/dev-center');
    await expect(authenticatedPage.getByText(/python/i)).toBeVisible();
  });

  test('Node.js code example is shown', async ({ authenticatedPage, mockApi }) => {
    await mockApi({ '**/api/api-keys': { body: MOCK_API_KEYS } });
    await authenticatedPage.goto('/dev-center');
    await expect(authenticatedPage.getByText(/node|javascript/i)).toBeVisible();
  });
});
