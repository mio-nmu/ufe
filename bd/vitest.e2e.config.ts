import 'dotenv/config';
import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from './tests/setup/db.js';

// E2E tests run the real app against a throwaway in-memory MongoDB started
// by the global setup; DATABASE_URL is pointed at it BEFORE any module
// (including the Prisma singleton) is imported.

export default defineConfig({
  test: {
    env: {
      ADMIN_PIN_CODE: '1234',
      AUTH_RATE_LIMIT_MAX: '1000',
      // Cheap hashing and generous rate limits so the suite is fast and never
      // trips the limiter — the limiter itself has its own unit-level coverage.
      BCRYPT_COST: '4',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_FOLDER: 'test-folder',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_ACCESS_SECRET:
        process.env.JWT_ACCESS_SECRET ?? 'e2e-test-access-secret-0123456789abcdef0123456',
      JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET ?? 'e2e-test-refresh-secret-0123456789abcdef0123456',
      MAX_UPLOAD_MB: '1', // small so the oversize test is cheap
      NODE_ENV: 'test',
      PIN_RATE_LIMIT_MAX: '1000',
      RATE_LIMIT_MAX: '10000',
      STORAGE_PROVIDER: 'cloudinary',
    },
    environment: 'node',
    globalSetup: './tests/setup/e2e-global-setup.ts',
    hookTimeout: 120_000,
    include: ['tests/e2e/**/*.e2e.test.ts'],
    testTimeout: 30_000,
  },
});
