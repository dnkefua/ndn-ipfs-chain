import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for NDN IPFS Chain Dashboard
 * Run with: npx playwright test
 */

const BASE_URL = process.env.DASHBOARD_URL || 'http://localhost:3001';

test.describe('Dashboard', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.describe('Landing Page', () => {
    test('should load landing page with correct title', async () => {
      await page.goto(BASE_URL);

      await expect(page).toHaveTitle(/NDN IPFS Chain/);
      await expect(page.locator('h1')).toContainText(/IPFS/i);
    });

    test('should have navigation to dashboard', async () => {
      await page.goto(BASE_URL);

      const dashboardLink = page.locator('a[href="/dashboard"]');
      await expect(dashboardLink).toBeVisible();
    });

    test('should have navigation to auth page', async () => {
      await page.goto(BASE_URL);

      const authLink = page.locator('a[href="/auth"]');
      await expect(authLink).toBeVisible();
    });
  });

  test.describe('Authentication', () => {
    test('should load auth page', async () => {
      await page.goto(`${BASE_URL}/auth`);

      await expect(page.locator('h1, h2')).toContainText(/sign|auth|connect|wallet/i);
    });

    test('should show connect wallet button', async () => {
      await page.goto(`${BASE_URL}/auth`);

      const connectButton = page.locator('button:has-text("Connect"), button:has-text("Wallet")');
      await expect(connectButton).toBeVisible();
    });
  });

  test.describe('Dashboard Page', () => {
    test('should require authentication', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Should redirect to auth or show error
      const url = page.url();
      expect(url).toMatch(/auth|login/);
    });

    test('should show pins section when authenticated', async () => {
      // This would require mock authentication
      // For now, just verify the page structure exists
      await page.goto(`${BASE_URL}/dashboard`);

      // Check for demo mode indicator (current implementation)
      await expect(page.locator('text=Demo Mode')).toBeVisible();
    });

    test('should display pin table headers', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible();

      // Check for expected column headers
      const headerTexts = await headers.allTextContents();
      expect(headerTexts).toEqual(
        expect.arrayContaining(['Name', 'CID', 'Size', 'Status', 'Created', 'Actions'])
      );
    });

    test('should show upload section', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      const uploadSection = page.locator('text=Upload, text=New, text=Content');
      await expect(uploadSection.first()).toBeVisible();
    });
  });

  test.describe('Analytics Page', () => {
    test('should load analytics page', async () => {
      await page.goto(`${BASE_URL}/dashboard/analytics`);

      await expect(page.locator('h1, h2').first()).toContainText(/analytics|usage|bandwidth/i);
    });
  });

  test.describe('API Keys Page', () => {
    test('should load API keys page', async () => {
      await page.goto(`${BASE_URL}/dashboard/api-keys`);

      await expect(page.locator('h1, h2').first()).toContainText(/api\s*key/i);
    });
  });

  test.describe('Lifecycle Page', () => {
    test('should load lifecycle page', async () => {
      await page.goto(`${BASE_URL}/dashboard/lifecycle`);

      await expect(page.locator('h1, h2').first()).toContainText(/lifecycle|tier|storage/i);
    });
  });

  test.describe('Triggers Page', () => {
    test('should load triggers page', async () => {
      await page.goto(`${BASE_URL}/dashboard/triggers`);

      await expect(page.locator('h1, h2').first()).toContainText(/trigger|contract|event/i);
    });
  });

  test.describe('Teams Page', () => {
    test('should load teams page', async () => {
      await page.goto(`${BASE_URL}/dashboard/teams`);

      await expect(page.locator('h1, h2').first()).toContainText(/team|member|organization/i);
    });
  });

  test.describe('Billing Page', () => {
    test('should load billing page', async () => {
      await page.goto(`${BASE_URL}/dashboard/billing`);

      await expect(page.locator('h1, h2').first()).toContainText(/billing|payment|subscription/i);
    });
  });

  test.describe('Models Page', () => {
    test('should load models page', async () => {
      await page.goto(`${BASE_URL}/dashboard/models`);

      await expect(page.locator('h1, h2').first()).toContainText(/model|ai|weight/i);
    });
  });

  test.describe('Status Page', () => {
    test('should load status page', async () => {
      await page.goto(`${BASE_URL}/dashboard/status`);

      await expect(page.locator('h1, h2').first()).toContainText(/status|health/i);
    });
  });

  test.describe('Docs Page', () => {
    test('should load docs page', async () => {
      await page.goto(`${BASE_URL}/dashboard/docs`);

      await expect(page.locator('h1, h2').first()).toContainText(/doc|api|reference/i);
    });
  });

  test.describe('Records Pages', () => {
    test('should load records page', async () => {
      await page.goto(`${BASE_URL}/dashboard/records`);

      await expect(page.locator('h1, h2').first()).toContainText(/record|schema|view/i);
    });

    test('should load schemas page', async () => {
      await page.goto(`${BASE_URL}/dashboard/records/schemas`);

      await expect(page.locator('h1, h2').first()).toContainText(/schema/i);
    });

    test('should load views page', async () => {
      await page.goto(`${BASE_URL}/dashboard/records/views`);

      await expect(page.locator('h1, h2').first()).toContainText(/view/i);
    });
  });

  test.describe('Responsive Design', () => {
    test('should render correctly on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);

      await expect(page.locator('h1')).toBeVisible();
    });

    test('should render correctly on tablet', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);

      await expect(page.locator('h1')).toBeVisible();
    });

    test('should render correctly on desktop', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);

      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load landing page within 3 seconds', async () => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000);
    });

    test('should have no console errors on landing page', async () => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);

      expect(errors).toHaveLength(0);
    });
  });
});
