import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: ['**/*libsql*.test.ts', 'node_modules/**', 'dist/**'],
		browser: {
			enabled: true,
			headless: true,
			provider: 'playwright',
			// https://vitest.dev/guide/browser/playwright
			instances: [
				{ browser: 'chromium' },
				// { browser: 'firefox' },
				// { browser: 'webkit' },
			],
		},
	},
});
