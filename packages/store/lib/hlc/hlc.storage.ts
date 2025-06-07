import type { HLC } from "./types";
import type { StorageAdapter } from "../storage/types";

import { generateHLC } from "./hlc";

export const loadHLC = async (
  adapter: StorageAdapter,
  basePath: string,
  collectionName: string,
): Promise<HLC> => {
  const content = await adapter.read(`${basePath}/${collectionName}.hlc.json`);

  if (!content) {
    return generateHLC();
  }

  return JSON.parse(content);
};

export const saveHLC = async (
  adapter: StorageAdapter,
  basePath: string,
  collectionName: string,
  hlc: HLC,
): Promise<void> => {
  await adapter.write(
    `${basePath}/${collectionName}.hlc.json`,
    JSON.stringify(hlc),
  );
};
