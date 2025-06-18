import type { Client } from '@libsql/client';
import type { StorageAdapter } from './types';

import { createListeners } from '../utils/listeners';

export type LibSQLAdapterConfig = {
	client: Client;
	tablePrefix?: string;
};

const DEFAULT_TABLE_PREFIX = '__eb_store';

const createTableName = (prefix: string, suffix: string) =>
	`${prefix}_${suffix}`;

const initializeTables = async (client: Client, tablePrefix: string) => {
	const dataTable = createTableName(tablePrefix, 'data');
	const hlcTable = createTableName(tablePrefix, 'hlc');

	await client.execute(`
		CREATE TABLE IF NOT EXISTS ${dataTable} (
			collection TEXT PRIMARY KEY,
			data TEXT NOT NULL
		)
	`);

	await client.execute(`
		CREATE TABLE IF NOT EXISTS ${hlcTable} (
			collection TEXT PRIMARY KEY,
			hlc TEXT NOT NULL
		)
	`);
};

export function createLibSQLAdapter(
	collection: string,
	config: LibSQLAdapterConfig,
): StorageAdapter {
	const { notifyListeners, registerListener, unregisterListener } =
		createListeners();

	const tablePrefix = config.tablePrefix ?? DEFAULT_TABLE_PREFIX;
	const dataTable = createTableName(tablePrefix, 'data');
	const hlcTable = createTableName(tablePrefix, 'hlc');

	// Initialize tables on first use
	let tablesInitialized = false;
	const ensureTablesExist = async () => {
		if (!tablesInitialized) {
			await initializeTables(config.client, tablePrefix);
			tablesInitialized = true;
		}
	};

	return {
		loadData: async () => {
			await ensureTablesExist();

			const result = await config.client.execute({
				sql: `SELECT data FROM ${dataTable} WHERE collection = ?`,
				args: [collection],
			});

			if (result.rows.length === 0 || !result.rows[0]) {
				return null;
			}

			return result.rows[0].data as string;
		},

		saveData: async (data: string) => {
			await ensureTablesExist();

			await config.client.execute({
				sql: `INSERT OR REPLACE INTO ${dataTable} (collection, data) VALUES (?, ?)`,
				args: [collection, data],
			});

			notifyListeners();
		},

		loadHLC: async () => {
			await ensureTablesExist();

			const result = await config.client.execute({
				sql: `SELECT hlc FROM ${hlcTable} WHERE collection = ?`,
				args: [collection],
			});

			if (result.rows.length === 0 || !result.rows[0]) {
				return null;
			}

			return result.rows[0].hlc as string;
		},

		saveHLC: async (data: string) => {
			await ensureTablesExist();

			await config.client.execute({
				sql: `INSERT OR REPLACE INTO ${hlcTable} (collection, hlc) VALUES (?, ?)`,
				args: [collection, data],
			});
		},

		registerListener,
		unregisterListener,
	};
}
