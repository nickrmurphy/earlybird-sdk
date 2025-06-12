// @vitest-environment jsdom
import 'fake-indexeddb/auto'; // automatically sets globalThis.indexedDB etc.

import { Directory, Filesystem } from '@capacitor/filesystem';
import { createCapacitorAdapter } from '../../storage/capacitor-adapter';
import { createStoreBenchmarks } from './store.bench-utils';

createStoreBenchmarks(
	'Capacitor',
	() =>
		createCapacitorAdapter({
			fs: Filesystem,
			directory: Directory.Temporary,
		}),
	undefined,
	10, // Reduced to 10 for speed. Investigate performance issues.
);
