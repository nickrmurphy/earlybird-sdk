import type { HLC } from './hlc';

import { describe, expect, test } from 'vitest';
import { createClock } from './hlc';
import { unwrap, unwrapObject, wrap, wrapObject } from './wrap';

describe('wrap', () => {
	test('wraps value with clock', () => {
		const clock = createClock();
		const result = wrap('test', clock);
		expect(result._value).toBe('test');
		expect(result._hlc).toBeDefined();
	});
});

describe('wrapObject', () => {
	test('wraps object values', () => {
		const clock = createClock();
		const result = wrapObject({ key: 'value' }, clock);
		expect(result.key._value).toBe('value');
	});
});

describe('unwrap', () => {
	test('extracts value from field', () => {
		const field = { _value: 'test', _hlc: 'clock-is-something' as HLC };
		expect(unwrap(field)).toBe('test');
	});
});

describe('unwrapObject', () => {
	test('extracts values from object', () => {
		const doc = { key: { _value: 'value', _hlc: 'clock-is-something' as HLC } };
		expect(unwrapObject(doc)).toEqual({ key: 'value' });
	});
});
