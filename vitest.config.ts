import path from 'node:path'
import { defineConfig } from 'vitest/config'

const root = path.resolve(__dirname)

export default defineConfig({
  resolve: {
    alias: {
      '@arch/core': path.join(root, 'packages/arch-core/src/index.ts'),
      '@arch/graph': path.join(root, 'packages/arch-graph/src/index.ts'),
      '@arch/parser-ts': path.join(root, 'packages/arch-parser-ts/src/index.ts'),
      '@arch/context': path.join(root, 'packages/arch-context/src/index.ts'),
      '@arch/cli': path.join(root, 'packages/arch-cli/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/test/**/*.test.ts'],
    exclude: ['**/dist/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/**/src/**/*.ts'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
})
