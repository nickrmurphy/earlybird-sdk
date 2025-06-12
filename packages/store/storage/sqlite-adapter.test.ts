// @vitest-environment node

import { createStorageAdapterTests } from './adapters.test-utils';
import { createSqliteAdapter } from './sqlite-adapter';

const sqliteAdapter = createSqliteAdapter();
createStorageAdapterTests('SQLite', sqliteAdapter);