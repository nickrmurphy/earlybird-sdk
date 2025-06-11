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
			external: ['zod', 'valibot', '@capacitor/filesystem'],
		},
	},
	plugins: [
		dts({
			insertTypesEntry: true,
			outDir: 'dist',
		}),
	],
});
