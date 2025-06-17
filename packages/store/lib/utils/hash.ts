/**
 * Creates a hash of an object using a djb2-based algorithm.
 * djb2 is a simple hash function by Daniel J. Bernstein with good distribution properties.
 * This implementation serializes the object to a deterministic string representation
 * before hashing, making it suitable for cache keys and object comparison.
 */
export function hashObject(obj: unknown): string {
	const str = JSON.stringify(
		obj,
		Object.keys(obj as Record<string, unknown>).sort(),
	);
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36);
}
