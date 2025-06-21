import type { DocumentFromSchema, HLC, StoreKey, StoreOutput, DatabaseConfig, Entity, Document } from "../types";
import { hashObject, makeTimestamps } from "../utils";

export function makeDocument<TConfig extends DatabaseConfig, TStoreName extends StoreKey<TConfig>>(
    hlc: Pick<HLC, "tick">,
    data: StoreOutput<TConfig, TStoreName>
): DocumentFromSchema<TConfig['stores'][TStoreName]> {
    return {
        $id: data.id,
        $data: data,
        $timestamps: makeTimestamps(hlc, data),
        $hash: hashObject(data)
    } as DocumentFromSchema<TConfig['stores'][TStoreName]>;
}

export function updateDocument<T extends Entity>(
    hlc: Pick<HLC, "tick">,
    doc: Document<T>,
    data: Partial<T>
): Document<T> {
    const updatedTimestamps = { ...doc.$timestamps, ...makeTimestamps(hlc, data) };
    const updatedData = { ...doc.$data, ...data };
    return {
        $id: doc.$id,
        $data: updatedData,
        $timestamps: updatedTimestamps,
        $hash: hashObject(updatedData)
    };
}
