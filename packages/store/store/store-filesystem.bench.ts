// @vitest-environment node

import { rmSync } from 'node:fs';
import { createNodeFsAdapter } from '../storage/node-adapter';
import { createStoreBenchmarks } from './store.bench-utils';

const cleanupTempFiles = () => {
	try {
		// Clean up any files that might be created during benchmarks
		rmSync('users', { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
};

createStoreBenchmarks('NodeFS', createNodeFsAdapter, cleanupTempFiles, 1000);