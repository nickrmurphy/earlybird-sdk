import type { HLC } from "../types";

export function makeTimestamps<T extends object>(
    hlc: Pick<HLC, "tick">,
    data: T
): { [K in keyof T]: string } {
    const $timestamps = Object.fromEntries(
        Object.keys(data).map(key => [key, hlc.tick()])
    ) as { [K in keyof T]: string };
    return $timestamps;
}
