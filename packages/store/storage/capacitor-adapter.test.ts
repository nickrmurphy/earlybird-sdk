// @vitest-environment jsdom
import 'fake-indexeddb/auto'; // automatically sets globalThis.indexedDB etc.

import { Directory, Filesystem } from '@capacitor/filesystem';
import { createStorageAdapterTests } from './adapters.test-utils';
import { createCapacitorAdapter } from './capacitor-adapter';

const capacitorAdapter = createCapacitorAdapter({
	fs: Filesystem,
	directory: Directory.Temporary,
});

createStorageAdapterTests('Capacitor', capacitorAdapter);
