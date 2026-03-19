import { test as base, type Page } from '@playwright/test';

type MockResponse = {
  status?: number;
  body: unknown;
};

type Fixtures = {
  mockApi: (routes: Record<string, MockResponse>) => Promise<void>;
  authenticatedPage: Page;
  guestPage: Page;
};

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.route('**/api/auth/session', route =>
      route.fulfill({
        body: JSON.stringify({
          expires: new Date(Date.now() + 86400000).toISOString(),
          user: { email: 'test@example.com', image: null, name: 'Test User' },
        }),
        contentType: 'application/json',
        status: 200,
      }),
    );
    await use(page);
  },

  guestPage: async ({ page }, use) => {
    await page.route('**/api/auth/session', route =>
      route.fulfill({
        body: JSON.stringify({}),
        contentType: 'application/json',
        status: 200,
      }),
    );
    await use(page);
  },

  mockApi: async ({ page }, use) => {
    const mockApi = async (routes: Record<string, MockResponse>) => {
      // Parse routes and sort by specificity, prioritizing specific methods
      const parsedRoutes = Object.entries(routes)
        .map(([pattern, response]) => {
          const methodMatch = pattern.match(/^(.+)\s+(GET|POST|PUT|DELETE|PATCH)$/);
          const url = methodMatch ? methodMatch[1] : pattern;
          const method = methodMatch ? methodMatch[2] : null;
          const specificity = url.length;
          return { method, response, specificity, url };
        })
        .sort((a, b) => {
          // Primary sort: by specificity (longer URLs first)
          if (b.specificity !== a.specificity) {
            return b.specificity - a.specificity;
          }
          // Secondary sort: specific methods before null methods (for same URL)
          if (a.url === b.url) {
            if (a.method === null && b.method !== null) return 1;
            if (a.method !== null && b.method === null) return -1;
          }
          return 0;
        });

      // Group routes by unique URL and register one handler per URL
      const uniqueUrls = [...new Set(parsedRoutes.map(r => r.url))];

      for (const urlPattern of uniqueUrls) {
        await page.route(urlPattern, route => {
          const requestMethod = route.request().method();
          const requestUrl = route.request().url();

          // Find the best matching route for this request
          for (const candidate of parsedRoutes) {
            // Check method first
            if (candidate.method !== null && candidate.method !== requestMethod) {
              continue;
            }

            // Check if URL pattern matches the request URL
            const urlRegex = candidate.url.replace(/\./g, '\\.').replace(/\*\*/g, '.+').replace(/\*/g, '[^/]*');
            if (new RegExp(`^${urlRegex}$`).test(requestUrl)) {
              return route.fulfill({
                body: JSON.stringify(candidate.response.body),
                contentType: 'application/json',
                status: candidate.response.status ?? 200,
              });
            }
          }

          return route.fallback();
        });
      }
    };
    await use(mockApi);
  },
});

export { expect } from '@playwright/test';
