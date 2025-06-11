import type { StorageAdapter } from '../storage/types';
import { getCollectionPath, getFilePath } from './utils';

export const readRaw = async (
	adapter: StorageAdapter,
	collection: string,
	id: string,
): Promise<unknown | null> => {
	const content = await adapter.read(getFilePath(collection, id));
	if (!content) return null;
	return JSON.parse(content);
};

export const writeRaw = async <T>(
	adapter: StorageAdapter,
	collection: string,
	id: string,
	data: T,
): Promise<void> => {
	await adapter.write(getFilePath(collection, id), JSON.stringify(data));
};

export const listRaw = async (
	adapter: StorageAdapter,
	collection: string,
): Promise<string[]> => {
	const files = await adapter.list(getCollectionPath(collection));
	return files
		.map((file) => file.split('.json')[0] ?? null)
		.filter((file) => file !== null);
};
