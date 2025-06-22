import type { INonceProvider, ITimeProvider } from '../utils/providers';

export function createMockTimeProvider(
	fixedDate: Date = new Date('2023-01-01T00:00:00.000Z'),
): ITimeProvider {
	let currentTime = fixedDate;

	return {
		now: () => currentTime,
		// Allow tests to advance time manually
		setTime: (newTime: Date) => {
			currentTime = newTime;
		},
		advanceTo: (milliseconds: number) => {
			currentTime = new Date(currentTime.getTime() + milliseconds);
		},
	} as ITimeProvider & {
		setTime: (newTime: Date) => void;
		advanceTo: (milliseconds: number) => void;
	};
}

export function createMockNonceProvider(
	sequence: string[] = ['abc123'],
): INonceProvider {
	let index = 0;

	return {
		generate: () => {
			const nonce = sequence[index % sequence.length];
			index++;
			return nonce;
		},
		// Allow tests to reset sequence
		reset: () => {
			index = 0;
		},
	} as INonceProvider & {
		reset: () => void;
	};
}

export function createIncrementingNonceProvider(
	prefix = 'nonce',
): INonceProvider {
	let counter = 0;

	return {
		generate: () => `${prefix}${++counter}`,
		reset: () => {
			counter = 0;
		},
	} as INonceProvider & {
		reset: () => void;
	};
}

export function createFixedNonceProvider(nonce = 'fixed123'): INonceProvider {
	return {
		generate: () => nonce,
	};
}
