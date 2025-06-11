import { useRef } from 'react';

// Custom hook to stabilize callback functions based on their string representation
export function useStableCallback<T extends (...args: any[]) => any>(
	fn: T | undefined,
): T | undefined {
	const fnRef = useRef<T>(undefined);
	const fnStringRef = useRef<string>(undefined);

	const currentFnString = fn?.toString();

	// Only update the ref if the function logic actually changed
	if (currentFnString !== fnStringRef.current) {
		fnRef.current = fn!;
		fnStringRef.current = currentFnString!;
	}

	return fnRef.current;
}
