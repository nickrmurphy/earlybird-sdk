import type { StorageAdapter } from "./types";
import type {
  Directory,
  Encoding,
  FilesystemPlugin,
} from "@capacitor/filesystem";

type CapacitorAdapterConfig = {
  fs: FilesystemPlugin;
  directory: Directory;
  encoding: Encoding;
};

const readFile = async (
  config: CapacitorAdapterConfig,
  path: string,
): Promise<string | null> => {
  try {
    const fileResult = await config.fs.readFile({
      path,
      encoding: config.encoding,
      directory: config.directory,
    });

    if (typeof fileResult.data === "string") {
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

const writeFile = async (
  config: CapacitorAdapterConfig,
  path: string,
  data: string,
): Promise<void> => {
  await config.fs.writeFile({
    path,
    data,
    encoding: config.encoding,
    directory: config.directory,
    recursive: true,
  });
};

const listFiles = async (
  config: CapacitorAdapterConfig,
  path: string,
): Promise<string[]> => {
  try {
    const dirResult = await config.fs.readdir({
      path,
      directory: config.directory,
    });
    const fileNames = dirResult.files
      .filter((file) => file.type === "file")
      .map((file) => file.name)
      .sort();

    return fileNames;
  } catch (error) {
    console.warn("Unable to read directory", path, error);
    return [];
  }
};

export const createCapacitorAdapter = (
  config: CapacitorAdapterConfig,
): StorageAdapter => {
  return {
    read: async (path: string): Promise<string | null> => {
      return readFile(config, path);
    },
    write: async (path: string, data: string): Promise<void> => {
      await writeFile(config, path, data);
    },
    list: async (path: string): Promise<string[]> => {
      return listFiles(config, path);
    },
  };
};
