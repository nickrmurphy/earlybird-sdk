export function unwrap(obj: unknown): unknown {
	// Base case: Is this a CRDT field? (has both value and metadata)
	if (obj && typeof obj === 'object' && '_value' in obj && '_hlc' in obj) {
		return obj._value; // Extract just the user data
	}

	// Recursive case: Process nested objects/arrays
	if (Array.isArray(obj)) {
		return obj.map((obj) => unwrap(obj));
	}

	if (obj && typeof obj === 'object') {
		const result: { [key: string]: unknown } = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = unwrap(value); // Recurse on each property
		}
		return result;
	}

	return obj; // Primitives unchanged
}
