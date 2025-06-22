export interface ITimeProvider {
	now(): Date;
}

export interface INonceProvider {
	generate(): string;
}

export const defaultTimeProvider: ITimeProvider = {
	now: () => new Date(),
};

export const defaultNonceProvider: INonceProvider = {
	generate: () => Math.random().toString(36).substring(2, 8),
};
