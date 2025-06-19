import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['**/*libsql*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: './coverage/node',
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
		},
	},
});
