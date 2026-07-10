import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Next.js aliases the `server-only` guard at build time; stub it so
      // server modules (e.g. email-image-engine) can be unit-tested in Node.
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.js'),
    },
  },
});
