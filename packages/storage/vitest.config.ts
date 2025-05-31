import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
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
    exclude: ['src/storageAdapter.test.ts'],
    
    // Environment
    environment: 'node'
  }
})