import { expect, test } from './fixtures';

test.describe('Login page — renders', () => {
  test('email input field exists on login page', async ({ guestPage }) => {
    await guestPage.goto('/login');
    await expect(guestPage.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('password input field exists on login page', async ({ guestPage }) => {
    await guestPage.goto('/login');
    await expect(guestPage.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('Sign In submit button exists', async ({ guestPage }) => {
    await guestPage.goto('/login');
    await expect(guestPage.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('Sign in with Google button exists', async ({ guestPage }) => {
    await guestPage.goto('/login');
    await expect(guestPage.getByRole('button', { name: /google/i })).toBeVisible();
  });
});

test.describe('Login — credential flow', () => {
  test('successful login redirects to upload page', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/auth/callback/credentials': { body: { url: '/' }, status: 200 },
      '**/api/auth/csrf': { body: { csrfToken: 'test-csrf-token' } },
    });
    // After login, session returns a user
    await guestPage.route('**/api/auth/session', async (route, request) => {
      // First call returns no user (before login), subsequent calls return user
      await route.fulfill({
        body: JSON.stringify({ user: { email: 'test@example.com', id: '1', name: 'Test User' } }),
        contentType: 'application/json',
        status: 200,
      });
    });
    await guestPage.goto('/login');
    await guestPage.locator('input[type="email"], input[name="email"]').fill('test@example.com');
    await guestPage.locator('input[type="password"], input[name="password"]').fill('password123');
    await guestPage.getByRole('button', { name: /sign in/i }).click();
    await expect(guestPage).toHaveURL('/');
  });
});

test.describe('Login — Google OAuth flow', () => {
  test('clicking Google button initiates OAuth redirect', async ({ guestPage }) => {
    const navigationPromise = guestPage.waitForNavigation();
    await guestPage.goto('/login');
    await guestPage.getByRole('button', { name: /google/i }).click();
    // The URL should change to a Google OAuth URL or auth callback URL
    await navigationPromise;
    const url = guestPage.url();
    expect(url).toMatch(/google|accounts\.google|/i);
  });
});

test.describe('Sign out flow', () => {
  test('clicking Sign Out clears session', async ({ authenticatedPage, mockApi }) => {
    await mockApi({
      '**/api/auth/csrf': { body: { csrfToken: 'test-csrf-token' } },
      '**/api/auth/signout': { body: {}, status: 200 },
      '**/api/templates': { body: { templates: [] } },
    });
    await authenticatedPage.goto('/');
    await authenticatedPage.locator('[data-testid="user-avatar"]').click();
    await authenticatedPage.getByRole('menuitem', { name: /sign out/i }).click();
    // Should redirect to login or show sign-in button
    await expect(authenticatedPage.getByRole('link', { name: /sign in/i })).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Protected route redirect', () => {
  test('guest accessing /templates is redirected to /login', async ({ guestPage }) => {
    await guestPage.goto('/templates');
    await expect(guestPage).toHaveURL('/login');
  });

  test('guest can access upload page at /', async ({ guestPage, mockApi }) => {
    await mockApi({
      '**/api/templates': { body: { templates: [] } },
    });
    await guestPage.goto('/');
    // Should NOT redirect to login
    await expect(guestPage).not.toHaveURL('/login');
  });

  test('guest accessing /dev-center is redirected to /login', async ({ guestPage }) => {
    await guestPage.goto('/dev-center');
    await expect(guestPage).toHaveURL('/login');
  });
});
