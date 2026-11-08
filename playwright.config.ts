import { defineConfig, devices } from '@playwright/test';

/**
 * P10.5: smoke test config. `webServer` auto-starts the real Vite dev server (so the test hits
 * real app code, not a separate build artifact) and waits for it to come up before running specs;
 * `reuseExistingServer` lets a dev already running `npm run dev` on this port skip the relaunch.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
