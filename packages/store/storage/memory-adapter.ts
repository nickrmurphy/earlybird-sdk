import type {
	ListFilesMethod,
	ReadFileMethod,
	StorageAdapter,
	WriteFileMethod,
} from './types';

const read: ReadFileMethod = async (path: string): Promise<string | null> => {
	return memoryStorage.get(path) || null;
};

const write: WriteFileMethod = async (
	path: string,
	content: string,
): Promise<void> => {
	memoryStorage.set(path, content);
};

const list: ListFilesMethod = async (directory: string): Promise<string[]> => {
	const files: string[] = [];

	for (const path of memoryStorage.keys()) {
		// Check if path starts with directory and has no additional subdirectories
		if (path.startsWith(directory)) {
			const relativePath = path.substring(directory.length);
			// Remove leading slash if present
			const cleanPath = relativePath.startsWith('/')
				? relativePath.substring(1)
				: relativePath;

			// Only include files in this directory (no subdirectories)
			if (cleanPath && !cleanPath.includes('/')) {
				files.push(cleanPath);
			}
		}
	}

	files.sort();
	return files;
};

const memoryStorage = new Map<string, string>();

export const createMemoryAdapter = (): StorageAdapter => {
	return {
		read,
		write,
		list,
	};
};
