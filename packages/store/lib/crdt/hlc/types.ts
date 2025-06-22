export interface IHLC {
	current(): string;
	tick(): string;
	advanceTo(timestamp: string): void;
}

export interface ITimeProvider {
	now(): Date;
}

export interface INonceProvider {
	generate(): string;
}
