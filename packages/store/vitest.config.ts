import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: './coverage',
			include: ['storage/**/*.ts', 'store/**/*.ts'],
			exclude: [
				'**/*.test.ts',
				'**/*.test-utils.ts',
				'**/*.bench.ts',
				'**/*.bench-utils.ts',
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
