import type {
	ListFilesMethod,
	ReadFileMethod,
	StorageAdapter,
	WriteFileMethod,
} from './types';

import fs from 'node:fs';

const read: ReadFileMethod = async (path: string): Promise<string | null> => {
	try {
		const content = await fs.promises.readFile(path, {
			encoding: 'utf8',
		});
		return content;
	} catch (error) {
		console.warn(`Error reading file ${path}: ${error}`);
		return null;
	}
};

const write: WriteFileMethod = async (
	path: string,
	content: string,
): Promise<void> => {
	// Extract directory from path (everything before the last slash)
	const lastSlashIndex = path.lastIndexOf('/');
	if (lastSlashIndex > 0) {
		const dir = path.substring(0, lastSlashIndex);
		fs.mkdirSync(dir, { recursive: true });
	}

	fs.writeFileSync(path, content, { flag: 'w+' });
};

const list: ListFilesMethod = async (path: string): Promise<string[]> => {
	const files: string[] = [];

	try {
		const data = fs.readdirSync(path, { withFileTypes: true });

		for (const file of data) {
			if (file.isFile()) {
				files.push(file.name);
			}
		}
	} catch (error) {
		console.warn(`Error listing files in path ${path}: ${error}`);
	}
	files.sort();
	return files;
};

export const createNodeFsAdapter = (): StorageAdapter => {
	return {
		read,
		write,
		list,
	};
};
