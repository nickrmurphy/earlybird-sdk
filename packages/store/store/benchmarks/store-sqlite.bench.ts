// @vitest-environment node

import { createSqliteAdapter } from '../../storage/sqlite-adapter';
import { createStoreBenchmarks } from './store.bench-utils';

createStoreBenchmarks(
	'SQLite',
	() =>
		createSqliteAdapter({
			dbPath: 'test.db',
		}),
	undefined,
	10, // Reduced to 10 for speed. Investigate performance issues.
);
