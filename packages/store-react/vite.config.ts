import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'index.ts'),
			formats: ['es'],
			fileName: 'index',
		},
		rollupOptions: {
			external: [
				'react',
				'react-dom',
				'react/jsx-runtime',
				'@byearlybird/store',
			],
		},
	},
	plugins: [
		dts({
			insertTypesEntry: true,
			outDir: 'dist',
		}),
	],
});