import { defineConfig, devices } from '@playwright/test'
import dns from 'node:dns'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// disable the reordering behavior. Vite will then print the address as localhost https://vitejs.dev/config/server-options.html#server-host
dns.setDefaultResultOrder('verbatim')

export const E2E_PORT = 5174
export default defineConfig({
  outputDir: path.resolve(__dirname, 'playwright-report'),
  testDir: './test/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['github'], ['html']]
    : process.env.PLAYWRIGHT_HTML_REPORT
      ? [['html'], ['list']]
      : [['list']],
  timeout: process.env.CI ? 15000 : 10000,
  expect: {
    timeout: 5000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://localhost:${E2E_PORT}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    video: 'on-first-retry',
    launchOptions: {
      slowMo: parseInt(process.env.PLAYWRIGHT_SLOWMO ?? '') || 0,
      // force GPU hardware acceleration
      // (even in headless mode)
      args: [
        '--use-gl=egl',
        // PLAYWRIGHT_OFFLINE=1 fails every non-localhost DNS lookup inside the
        // browser — the egress gate proving a spec is network-free
        ...(process.env.PLAYWRIGHT_OFFLINE ? ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'] : []),
      ],
    },
    headless: process.env.PLAYWRIGHT_HEADED ? false : true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*firefox\.test\.[jt]s$/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*firefox\.test\.[jt]s$/,
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: `pnpm dev:test`,
    url: `http://localhost:${E2E_PORT}`,
    // Reusing a stale server that dies mid-run surfaces as a late page.goto
    // ERR_CONNECTION_REFUSED (the Klipy GIF spec is the suite's only late
    // full-page navigation, so it takes the hit). PLAYWRIGHT_NO_REUSE=1
    // forces a fresh server for bulletproof local runs.
    reuseExistingServer: process.env.PLAYWRIGHT_NO_REUSE ? false : !process.env.CI,
    timeout: 120000,
  },
})
