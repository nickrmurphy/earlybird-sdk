import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, 'index.ts'),
				'memory-adapter': resolve(__dirname, 'lib/storage/memory-adapter.ts'),
				'libsql-adapter': resolve(__dirname, 'lib/storage/libsql-adapter.ts'),
				'indexeddb-adapter': resolve(
					__dirname,
					'lib/storage/indexeddb-adapter.ts',
				),
			},
			formats: ['es'],
		},
		rollupOptions: {
			external: ['zod', 'valibot', '@libsql/client'],
		},
	},
	plugins: [
		dts({
			insertTypesEntry: true,
			outDir: 'dist',
		}),
	],
});
