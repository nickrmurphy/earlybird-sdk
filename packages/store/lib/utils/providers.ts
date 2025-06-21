export interface TimeProvider {
	now(): Date;
}

export interface NonceProvider {
	generate(): string;
}

export const defaultTimeProvider: TimeProvider = {
	now: () => new Date(),
};

export const defaultNonceProvider: NonceProvider = {
	generate: () => Math.random().toString(36).substring(2, 8),
};
