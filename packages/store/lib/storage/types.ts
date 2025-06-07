export type StorageAdapter = {
  // Returns file content as a string or null if file does not exist
  read(path: string): Promise<string | null>;
  // Resolves when the file has been written
  write(path: string, data: string): Promise<void>;
  // Returns a list of filenames in the given directory
  list(directory: string): Promise<string[]>;
};
