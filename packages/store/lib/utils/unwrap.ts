import { unflatten } from './flatten';

export function unwrap(obj: unknown): unknown {
	// Base case: Is this a CRDT field? (has both value and metadata)
	if (obj && typeof obj === 'object' && '_value' in obj && '_hlc' in obj) {
		return obj._value; // Extract just the user data
	}

	// Handle flattened CRDT document: keys like 'user.name', 'user.contact.email'
	if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
		const result: { [key: string]: unknown } = {};

		// First, extract the _value from each CRDT field
		for (const [key, value] of Object.entries(obj)) {
			if (
				value &&
				typeof value === 'object' &&
				'_value' in value &&
				'_hlc' in value
			) {
				result[key] = (value as any)._value;
			} else if (value && typeof value === 'object') {
				// Recursively unwrap nested objects
				result[key] = unwrap(value);
			} else {
				result[key] = value;
			}
		}

		// Then unflatten the dot-notation keys to nested objects
		return unflatten(result);
	}

	// Recursive case: Process arrays
	if (Array.isArray(obj)) {
		return obj.map((obj) => unwrap(obj));
	}

	return obj; // Primitives unchanged
}
