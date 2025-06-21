import type { StandardSchemaV1 } from '../../standard-schema.types';

export function standardValidate<T extends StandardSchemaV1>(
	schema: T,
	input: StandardSchemaV1.InferInput<T>,
): StandardSchemaV1.InferOutput<T> {
	const result = schema['~standard'].validate(input);
	if (result instanceof Promise) {
		throw new Error(
			'Async validation is not supported. Schema validation must be synchronous.',
		);
	}

	// if the `issues` field exists, the validation failed
	if (result.issues) {
		throw new Error(JSON.stringify(result.issues, null, 2));
	}

	return result.value;
}
