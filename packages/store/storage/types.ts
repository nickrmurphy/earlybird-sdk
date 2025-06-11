export type ReadFileMethod = (path: string) => Promise<string | null>;
export type WriteFileMethod = (path: string, data: string) => Promise<void>;
export type ListFilesMethod = (directory: string) => Promise<string[]>;

export type StorageAdapter = {
	// Returns file content as a string or null if file does not exist
	read: ReadFileMethod;
	// Resolves when the file has been written
	write: WriteFileMethod;
	// Returns a list of filenames in the given directory
	list: ListFilesMethod;
};
