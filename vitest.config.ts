import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Enable test isolation (default in Vitest)
    isolate: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: ['**/*.test.ts', '**/*.d.ts']
    },
    
    // Test file patterns
    include: ['src/**/*.test.ts'],
    
    // Environment
    environment: 'node'
  }
})