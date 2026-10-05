import { defineConfig, devices } from '@playwright/test';
import { BACKEND_PORT, DATABASE_URL, FRONTEND_PORT, RELAY_PORT, RELAY_URL } from './support/env';

// Three servers, as in production but local: the API, a relay in front
// of it (support/relay.mjs - it can add a delay to imitate Render's
// cold start), and the frontend built to call the API through that
// relay. BACKEND_URL is fixed into the frontend at build time, which is
// why the relay is always in the path rather than swapped in later.
//
// One worker: the tests share one database and one relay, and the
// cold-start test changes the relay's delay for everyone.
//
// E2E_SKIP_BUILD=1 reuses the last build, for quick local reruns.
const build = process.env.E2E_SKIP_BUILD ? '' : 'npm run build && ';

const backendEnv = {
  DATABASE_URL,
  // Prisma CLI commands prefer DIRECT_URL; pin it to the test database
  // so a value in backend/.env can never redirect a migration.
  DIRECT_URL: DATABASE_URL,
  PORT: String(BACKEND_PORT),
  NODE_ENV: 'test',
  // The in-process 5:30pm / 6:00pm jobs must never fire during a run.
  DISABLE_SCHEDULED_JOBS: 'true',
  JWT_SECRET: 'e2e-test-secret',
  FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
  CORS_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
  // Placeholders: the Google strategy needs them to boot, and the tests
  // never let a request reach Google.
  GOOGLE_CLIENT_ID: 'e2e-google-client-id',
  GOOGLE_CLIENT_SECRET: 'e2e-google-client-secret',
  GOOGLE_CALLBACK_URL: `http://localhost:${FRONTEND_PORT}/api/auth/google/callback`,
  PUPPETEER_SKIP_DOWNLOAD: 'true',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'API',
      cwd: '../backend',
      command: `npx prisma migrate deploy && npm run db:seed && ${build}npm run start`,
      url: `http://localhost:${BACKEND_PORT}/health`,
      env: backendEnv,
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      name: 'Relay',
      command: 'node support/relay.mjs',
      url: `${RELAY_URL}/__relay`,
      env: { RELAY_PORT: String(RELAY_PORT), BACKEND_PORT: String(BACKEND_PORT) },
      reuseExistingServer: false,
    },
    {
      name: 'Frontend',
      cwd: '../frontend',
      command: `${build}npm run start -- --port ${FRONTEND_PORT}`,
      url: `http://localhost:${FRONTEND_PORT}`,
      env: { BACKEND_URL: RELAY_URL, NEXT_TELEMETRY_DISABLED: '1' },
      timeout: 240_000,
      reuseExistingServer: false,
    },
  ],
});
