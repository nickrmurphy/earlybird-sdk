import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, 'index.ts'),
				'memory-adapter': resolve(__dirname, 'lib/storage/memory-adapter.ts'),
				'capacitor-adapter': resolve(
					__dirname,
					'lib/storage/capacitor-adapter.ts',
				),
			},
			formats: ['es'],
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
