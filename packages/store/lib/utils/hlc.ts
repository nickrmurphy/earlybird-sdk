export type HLC = `${string}-${string}-${string}`;

export type Clock = {
	current: () => HLC;
	tick: () => HLC;
};

const generateNonce = () => {
	return Math.random().toString(36).substring(2, 8);
};

const padLogical = (logical: number): string => {
	return logical.toString().padStart(6, '0');
};

export const generateHLC = (): HLC => {
	const timestamp = new Date().toISOString();
	const logical = padLogical(0);
	const nonce = generateNonce();
	return `${timestamp}-${logical}-${nonce}`;
};

export const advanceHLC = (hlc: HLC): HLC => {
	const now = new Date();
	const nowISO = now.toISOString();
	const nowTime = now.getTime();

	// Parse current HLC
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
	const nonce = generateNonce();
	return `${newTimestamp}-${logical}-${nonce}`;
};

export const createClock = (seedHLC = generateHLC()): Clock => {
	let hlc = seedHLC;

	const tick = (): HLC => {
		const newHLC = advanceHLC(hlc);
		hlc = newHLC;
		return hlc;
	};

	return {
		current: () => hlc,
		tick,
	};
};
