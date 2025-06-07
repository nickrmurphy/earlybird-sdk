import type { StorageAdapter } from "./types";

import fs from "node:fs";

const readFile = async (path: string): Promise<string | null> => {
  try {
    const content = fs.readFileSync(path).toString();
    return content;
  } catch (error) {
    console.warn(`Error reading file ${path}: ${error}`);
    return null;
  }
};

const writeFile = async (path: string, content: string): Promise<void> => {
  // Extract directory from path (everything before the last slash)
  const lastSlashIndex = path.lastIndexOf("/");
  if (lastSlashIndex > 0) {
    const dir = path.substring(0, lastSlashIndex);
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path, content, { flag: "w+" });
};

const listFiles = async (path: string): Promise<string[]> => {
  let files: string[] = [];

  const data = fs.readdirSync(path, { withFileTypes: true });

  for (const file of data) {
    if (file.isFile()) {
      files.push(file.name);
    }
  }

  return files;
};

export const createNodeFsAdapter = (): StorageAdapter => {
  return {
    read: async (path: string): Promise<string | null> => {
      return readFile(path);
    },
    write: async (path: string, data: string): Promise<void> => {
      await writeFile(path, data);
    },
    list: async (path: string): Promise<string[]> => {
      return listFiles(path);
    },
  };
};
