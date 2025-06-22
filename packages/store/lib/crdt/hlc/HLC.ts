import type { IHLC, INonceProvider, ITimeProvider } from './types';
import { advanceHLC, generateHLC } from './core';
import {
	defaultNonceProvider,
	defaultTimeProvider,
} from '../../utils/providers';

export class HLC implements IHLC {
	private currentValue: string;

	constructor(
		private timeProvider: ITimeProvider = defaultTimeProvider,
		private nonceProvider: INonceProvider = defaultNonceProvider,
		seedHLC?: string,
	) {
		this.currentValue = seedHLC ?? generateHLC(timeProvider, nonceProvider);
	}

	current(): string {
		return this.currentValue;
	}

	tick(): string {
		this.currentValue = advanceHLC(
			this.currentValue,
			this.timeProvider,
			this.nonceProvider,
		);
		return this.currentValue;
	}

	advanceTo(newHLC: string): void {
		if (newHLC <= this.currentValue) return;
		this.currentValue = newHLC;
	}
}
