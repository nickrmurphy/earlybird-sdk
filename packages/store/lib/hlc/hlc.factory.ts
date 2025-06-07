import type { HLC } from "./types";
import type { StorageAdapter } from "../storage/types";

import { advanceHLC } from "./hlc";
import { loadHLC, saveHLC } from "./hlc.storage";

export const createHLC = (
  adapter: StorageAdapter,
  basePath: string,
  collectionName: string,
) => {
  let hlc: HLC | null = null;

  const getCurrent = async (): Promise<HLC> => {
    if (hlc) {
      return hlc;
    }

    const loadedHLC = await loadHLC(adapter, basePath, collectionName);

    hlc = loadedHLC;

    return loadedHLC;
  };

  const advance = async (): Promise<HLC> => {
    const current = await getCurrent();
    const newHLC = advanceHLC(current);
    hlc = newHLC;
    await saveHLC(adapter, basePath, collectionName, newHLC);
    return newHLC;
  };

  return {
    getCurrent,
    advance,
  };
};
