import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const playgroundDirectory = dirname(fileURLToPath(import.meta.url));
const databaseFile = resolve(playgroundDirectory, 'e2e-membership.db');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4322',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm e2e:seed && pnpm exec astro dev --port 4322 --host 127.0.0.1',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: false,
    env: {
      DB_FILE_NAME: databaseFile,
    },
  },
});
