import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    // Tests share one database: run files one after another.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgres://flowcommerce:flowcommerce@localhost:5432/flowcommerce_test',
      FIREBASE_PROJECT_ID: 'flowcommerce-test',
    },
  },
});
