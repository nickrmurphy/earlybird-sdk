import type { Directory, FilesystemPlugin } from '@capacitor/filesystem';
import type { StorageAdapter } from './types';

import { Encoding } from '@capacitor/filesystem';
import { createListeners } from '../utils/listeners';

export type CapacitorAdapterConfig = {
	fs: FilesystemPlugin;
	directory: Directory;
};

const createStorePath = (collection: string) => `${collection}.json`;
const createHLCPath = (collection: string) => `${collection}.hlc.txt`;

const checkFileExists = async (
	fs: FilesystemPlugin,
	path: string,
	directory: Directory,
): Promise<boolean> => {
	try {
		await fs.stat({ path, directory });
		return true;
	} catch (error) {
		return false;
	}
};

const readFile = async (
	fs: FilesystemPlugin,
	path: string,
	directory: Directory,
): Promise<string | null> => {
	const fileResult = await fs.readFile({
		path,
		directory,
		encoding: Encoding.UTF8,
	});

	if (typeof fileResult.data === 'string') {
		return fileResult.data;
	}

	if (fileResult.data instanceof Blob) {
		const text = await fileResult.data.text();
		return text;
	}

	return null;
};

export function createCapacitorAdapter(
	collection: string,
	config: CapacitorAdapterConfig,
): StorageAdapter {
	const { notifyListeners, registerListener, unregisterListener } =
		createListeners();
	return {
		loadData: async () => {
			const storePath = createStorePath(collection);
			const exists = await checkFileExists(
				config.fs,
				storePath,
				config.directory,
			);

			if (!exists) {
				return null;
			}

			return readFile(config.fs, storePath, config.directory);
		},
		saveData: async (data: string) => {
			const storePath = createStorePath(collection);
			await config.fs.writeFile({
				path: storePath,
				data,
				directory: config.directory,
				encoding: Encoding.UTF8,
			});
			notifyListeners();
		},
		loadHLC: async () => {
			const hlcPath = createHLCPath(collection);
			const exists = await checkFileExists(
				config.fs,
				hlcPath,
				config.directory,
			);

			if (!exists) {
				return null;
			}

			return readFile(config.fs, hlcPath, config.directory);
		},
		saveHLC: async (data: string) => {
			const hlcPath = createHLCPath(collection);
			await config.fs.writeFile({
				path: hlcPath,
				data,
				directory: config.directory,
				encoding: Encoding.UTF8,
			});
		},
		registerListener,
		unregisterListener,
	};
}
