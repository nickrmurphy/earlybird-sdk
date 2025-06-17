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
 * Creates a deterministic string representation of an object.
 * Sorts keys to ensure consistent serialization regardless of property order.
 */
function serializeObject(obj: unknown): string {
	return JSON.stringify(
		obj,
		Object.keys(obj as Record<string, unknown>).sort(),
	);
}

/**
 * Creates a hash of an object by first serializing it to a deterministic string
 * representation, then applying the djb2 hash algorithm.
 * Suitable for cache keys and object comparison.
 */
export function hashObject(obj: unknown): string {
	return hash(serializeObject(obj));
}
