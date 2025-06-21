import type { HLC } from '../types';
import type { NonceProvider, TimeProvider } from '../utils/providers';
import { defaultNonceProvider, defaultTimeProvider } from '../utils/providers';

const padLogical = (logical: number): string => {
	return logical.toString().padStart(6, '0');
};

export const generateHLC = (
	timeProvider: TimeProvider = defaultTimeProvider,
	nonceProvider: NonceProvider = defaultNonceProvider,
): string => {
	const timestamp = timeProvider.now().toISOString();
	const logical = padLogical(0);
	const nonce = nonceProvider.generate();
	return `${timestamp}-${logical}-${nonce}`;
};

export const advanceHLC = (
	hlc: string,
	timeProvider: TimeProvider = defaultTimeProvider,
	nonceProvider: NonceProvider = defaultNonceProvider,
): string => {
	const now = timeProvider.now();
	const nowISO = now.toISOString();
	const nowTime = now.getTime();

	// Parse current string
	const parts = hlc.split('-');
	const currentTimestamp = parts.slice(0, 3).join('-'); // ISO timestamp part
	// biome-ignore lint/style/noNonNullAssertion: Static checking for string-string-string guards against this
	const currentLogical = Number.parseInt(parts[3]!, 10);
	const currentTime = new Date(currentTimestamp).getTime();

	let newLogical: number;
	let newTimestamp: string;

	if (nowTime > currentTime) {
		// Physical time advanced, reset logical counter
		newLogical = 0;
		newTimestamp = nowISO;
	} else if (nowTime === currentTime) {
		// Same physical time, increment logical counter
		newLogical = currentLogical + 1;
		newTimestamp = currentTimestamp;
	} else {
		// Physical time went backwards (clock adjustment), keep logical counter
		newLogical = currentLogical + 1;
		newTimestamp = currentTimestamp;
	}

	const logical = padLogical(newLogical);
	const nonce = nonceProvider.generate();
	return `${newTimestamp}-${logical}-${nonce}`;
};

export const createClock = (
	seedHLC?: string,
	timeProvider: TimeProvider = defaultTimeProvider,
	nonceProvider: NonceProvider = defaultNonceProvider,
): HLC => {
	let hlc = seedHLC ?? generateHLC(timeProvider, nonceProvider);

	const tick = (): string => {
		const newHLC = advanceHLC(hlc, timeProvider, nonceProvider);
		hlc = newHLC;
		return hlc;
	};

	const advance = (newHLC: string): void => {
		if (newHLC === hlc) return;
		if (newHLC < hlc) {
			hlc = newHLC;
		}
	};

	return {
		current: () => hlc,
		tick,
		advance,
	};
};
