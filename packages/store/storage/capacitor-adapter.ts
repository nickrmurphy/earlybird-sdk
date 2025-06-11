import {
	type Directory,
	Encoding,
	type FilesystemPlugin,
} from '@capacitor/filesystem';
import type { StorageAdapter } from './types';

export type CapacitorAdapterConfig = {
	fs: FilesystemPlugin;
	directory: Directory;
};

const read = async (
	config: CapacitorAdapterConfig,
	path: string,
): Promise<string | null> => {
	try {
		const fileResult = await config.fs.readFile({
			path,
			directory: config.directory,
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
	} catch (error) {
		console.warn(error);
		return null;
	}
};

const write = async (
	config: CapacitorAdapterConfig,
	path: string,
	data: string,
): Promise<void> => {
	await config.fs.writeFile({
		path,
		data,
		directory: config.directory,
		recursive: true,
		encoding: Encoding.UTF8,
	});
};

const list = async (
	config: CapacitorAdapterConfig,
	path: string,
): Promise<string[]> => {
	try {
		const dirResult = await config.fs.readdir({
			path,
			directory: config.directory,
		});
		const fileNames = dirResult.files
			.filter((file) => file.type === 'file')
			.map((file) => file.name)
			.sort();

		return fileNames;
	} catch (error) {
		console.warn('Unable to read directory', path, error);
		return [];
	}
};

export const createCapacitorAdapter = (
	config: CapacitorAdapterConfig,
): StorageAdapter => {
	return {
		read: async (path: string): Promise<string | null> => {
			return read(config, path);
		},
		write: async (path: string, data: string): Promise<void> => {
			await write(config, path, data);
		},
		list: async (path: string): Promise<string[]> => {
			return list(config, path);
		},
	};
};
