# E2E Testing with Playwright

This directory contains end-to-end tests for DealFlow Network using Playwright.

## Setup

Playwright is already installed as a dev dependency. To install browsers:

```bash
npx playwright install
```

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see the browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test tests/e2e/auth.spec.ts
```

### Run tests matching a pattern
```bash
npx playwright test --grep "login"
```

## Test Structure

```
tests/
├── e2e/              # E2E test files
│   └── auth.spec.ts  # Authentication tests
├── helpers/          # Reusable test utilities
│   └── auth.ts       # Auth helper functions
└── README.md         # This file
```

## Writing Tests

### Using the auth helpers

```typescript
import { test, expect } from "@playwright/test";
import { loginWithMagicLink, logout } from "../helpers/auth";

test("my test", async ({ page, baseURL }) => {
  // Login before the test
  await loginWithMagicLink(page, baseURL!);

  // Your test logic here
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Logout after
  await logout(page);
});
```

### Magic Link Authentication

In development mode, magic links are logged to the Docker console. The test helpers automatically extract these links from the logs, so you don't need to manually check email.

**Important:** Make sure your Docker container is running before running tests, as the tests rely on extracting magic links from Docker logs.

## Configuration

The Playwright configuration is in `playwright.config.ts` at the project root.

Key settings:
- **baseURL:** `http://localhost:3000` (configurable via env var)
- **Browser:** Chromium (Firefox and WebKit commented out)
- **Auto-start server:** `docker compose up` runs automatically before tests
- **Screenshots:** Captured on test failure
- **Traces:** Captured on first retry

## CI/CD

Tests are configured to run in CI with:
- Retries: 2 attempts on failure
- Workers: 1 (sequential execution)
- Screenshots and traces on failure

## Troubleshooting

### Tests can't find magic link
- Ensure Docker container is running: `docker compose up`
- Check Docker logs: `docker compose logs app`
- Verify the app is logging magic links in development mode

### Port conflicts
- Tests use `baseURL` from config, which defaults to `http://localhost:3000`
- Change the port in `playwright.config.ts` if needed

### Slow tests
- Use `test:e2e:ui` mode to see what's happening
- Check network tab for slow requests
- Consider increasing timeouts in `playwright.config.ts`

## Best Practices

1. **Use data-testid for dynamic content:** Add `data-testid` attributes to elements that may change
2. **Avoid hardcoded waits:** Use Playwright's auto-waiting instead of `page.waitForTimeout()`
3. **Clean up after tests:** Ensure tests don't leave data that affects other tests
4. **Use fixtures for auth:** Create authenticated contexts to avoid logging in for every test
5. **Run tests in parallel:** Playwright runs tests in parallel by default for speed

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
