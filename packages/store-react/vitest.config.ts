import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: './coverage',
			include: ['components/**/*.ts', 'components/**/*.tsx', 'hooks/**/*.ts', 'hooks/**/*.tsx'],
			exclude: [
				'**/*.test.ts',
				'**/*.test.tsx',
				'**/*.bench.ts',
				'**/*.d.ts',
				'dist/**',
				'node_modules/**',
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 70,
				statements: 80,
			},
		},
	},
});