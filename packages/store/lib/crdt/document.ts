import type { Entity, Document, HLC } from "../types";
import { hashObject, makeTimestamps } from "../utils";

export function makeDocument<T extends Entity>(hlc: Pick<HLC, "tick">, data: T): Document<T> {
    return {
        $id: data.id,
        $data: data,
        $timestamps: makeTimestamps(hlc, data),
        $hash: hashObject(data)
    };
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
