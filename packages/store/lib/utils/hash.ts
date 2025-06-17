/**
 * Creates a hash of a string using a djb2-based algorithm.
 * djb2 is a simple hash function by Daniel J. Bernstein with good distribution properties.
 */
export function hash(str: string): string {
	let hashValue = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hashValue = (hashValue << 5) - hashValue + char;
		hashValue = hashValue & hashValue; // Convert to 32-bit integer
	}
	return Math.abs(hashValue).toString(36);
}

/**
 * Creates a hash of an object by first serializing it to a deterministic string
 * representation, then applying the djb2 hash algorithm.
 * Suitable for cache keys and object comparison.
 */
export function hashObject(obj: unknown): string {
	const serialized = JSON.stringify(
		obj,
		Object.keys(obj as Record<string, unknown>).sort(),
	);
	return hash(serialized);
}

/**
 * Deterministically combines two hash strings into a single hash.
 * Order matters: combineHashes(a, b) !== combineHashes(b, a)
 */
export function combineHashes(a: string, b: string): string {
	return hash(`${a}:${b}`);
}
