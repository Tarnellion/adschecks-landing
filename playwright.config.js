// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * The suite runs against a REAL production build served the way Cloudflare
 * Pages serves it:
 *
 *   npm run build   → dist/client (+ dist/server for the Cloudflare adapter)
 *   npm run preview → wrangler, which also applies public/_headers and
 *                     public/_redirects — so header/redirect invariants are
 *                     testable here and not only in production.
 *
 * `astro preview` with @astrojs/cloudflare always binds port 4321.
 */
const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Analytics is opt-in at build time: without PUBLIC_GA_ID BaseLayout renders
 * neither the consent banner nor any gtag code. The consent tests need a build
 * that HAS the banner, so we inject a dummy measurement id. No request ever
 * reaches Google — the analytics spec intercepts and aborts them.
 *
 * Set PUBLIC_GA_ID yourself to override, or unset it in a build you reuse via
 * `reuseExistingServer` — the consent tests then skip themselves.
 */
const GA_ID = process.env.PUBLIC_GA_ID ?? 'G-TEST12345';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview',
    url: `${BASE_URL}/`,
    // Locally: reuse whatever is already on 4321 instead of rebuilding.
    // On CI: always build from scratch.
    reuseExistingServer: !process.env.CI,
    // A cold `astro build` plus wrangler boot is well over the 60s default.
    timeout: 240_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, PUBLIC_GA_ID: GA_ID },
  },
});
