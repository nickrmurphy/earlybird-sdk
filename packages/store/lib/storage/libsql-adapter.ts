import type { Client } from "@libsql/client/web";
import type { StorageAdapter } from "./types";

const readFile = async (
  client: Client,
  path: string,
): Promise<string | null> => {
  const result = await client.execute(
    "SELECT content FROM files WHERE path = ?",
    [path],
  );

  if (result.rows.length > 0) {
    return result.rows[0].content as string;
  }

  return null;
};

const writeFile = async (
  client: Client,
  path: string,
  data: string,
): Promise<void> => {
  await client.execute(
    "INSERT OR REPLACE INTO files (path, content) VALUES (?, ?)",
    [path, data],
  );
};

const listFiles = async (client: Client, path: string): Promise<string[]> => {
  const result = await client.execute(
    "SELECT path FROM files WHERE path LIKE ?",
    [`${path}/%`],
  );
  if (result.rows.length === 0) {
    return [];
  }

  const paths: string[] = [];

  for (const row of result.rows) {
    paths.push((row.path as string).toString());
  }

  paths.sort();

  return paths;
};

export const createLibSQLAdapter = (client: Client): StorageAdapter => {
  return {
    read: async (path: string): Promise<string | null> => {
      return readFile(client, path);
    },
    write: async (path: string, data: string): Promise<void> => {
      await writeFile(client, path, data);
    },
    list: async (path: string): Promise<string[]> => {
      return listFiles(client, path);
    },
  };
};
