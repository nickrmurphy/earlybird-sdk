// @vitest-environment node

import { createSqliteAdapter } from '../storage/sqlite-adapter';
import { createStoreBenchmarks } from './store.bench-utils';

createStoreBenchmarks(
	'SQLite',
	() =>
		createSqliteAdapter({
			dbPath: 'test.db',
		}),
	undefined,
	1000,
);
