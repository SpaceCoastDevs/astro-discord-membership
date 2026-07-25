import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { seedE2eData } from './seed.mjs';

const playgroundDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const databaseFile = resolve(playgroundDirectory, 'e2e-membership.db');

execFileSync('pnpm', ['exec', 'drizzle-kit', 'push', '--force'], {
  cwd: playgroundDirectory,
  env: { ...process.env, DB_FILE_NAME: databaseFile },
  stdio: 'inherit',
});

seedE2eData(databaseFile);
