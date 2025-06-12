// @vitest-environment node

import type {
	ListFilesMethod,
	ReadFileMethod,
	StorageAdapter,
	WriteFileMethod,
} from './types';

import { DatabaseSync } from 'node:sqlite';

interface SqliteAdapterConfig {
	dbPath?: string;
}

const createSqliteAdapter = (
	config: SqliteAdapterConfig = {},
): StorageAdapter => {
	const dbPath = config.dbPath || ':memory:';
	let db: DatabaseSync | null = null;

	const getDb = () => {
		if (!db) {
			db = new DatabaseSync(dbPath);

			// Create files table if it doesn't exist
			db.exec(`
				CREATE TABLE IF NOT EXISTS files (
					path TEXT PRIMARY KEY,
					content TEXT NOT NULL
				)
			`);
		}
		return db;
	};

	const read: ReadFileMethod = async (path: string): Promise<string | null> => {
		try {
			const database = getDb();
			const stmt = database.prepare('SELECT content FROM files WHERE path = ?');
			const result = stmt.get(path) as { content: string } | undefined;
			return result?.content || null;
		} catch (error) {
			console.warn(`Error reading file ${path}: ${error}`);
			return null;
		}
	};

	const write: WriteFileMethod = async (
		path: string,
		content: string,
	): Promise<void> => {
		const database = getDb();
		const stmt = database.prepare(
			'INSERT OR REPLACE INTO files (path, content) VALUES (?, ?)',
		);
		stmt.run(path, content);
	};

	const list: ListFilesMethod = async (
		directory: string,
	): Promise<string[]> => {
		try {
			const database = getDb();
			const stmt = database.prepare(
				'SELECT path FROM files WHERE path LIKE ? ORDER BY path',
			);
			const results = stmt.all(`${directory}/%`) as { path: string }[];

			return results
				.map((row) => row.path.split('/').pop() ?? null)
				.filter((row) => row !== null);
		} catch (error) {
			console.warn(`Error listing files in directory ${directory}: ${error}`);
			return [];
		}
	};

	return {
		read,
		write,
		list,
	};
};

export { createSqliteAdapter };
export type { SqliteAdapterConfig };
