import type { HLC } from './hlc';

import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { createClock } from './hlc';
import { unwrap, unwrapObject, wrap, wrapObject } from './wrap';

const stringSchema = z.string();
const objectSchema = z.object({
	key: z.string(),
});

describe('wrap', () => {
	test('wraps value with clock', () => {
		const clock = createClock();
		const result = wrap<typeof stringSchema>('test', clock);
		expect(result._value).toBe('test');
		expect(result._hlc).toBeDefined();
	});
});

describe('wrapObject', () => {
	test('wraps object values', () => {
		const clock = createClock();
		const result = wrapObject<typeof objectSchema>({ key: 'value' }, clock);
		expect(result.key._value).toBe('value');
	});
});

describe('unwrap', () => {
	test('extracts value from field', () => {
		const field = { _value: 'test', _hlc: 'clock-is-something' as HLC };
		expect(unwrap<typeof stringSchema>(field)).toBe('test');
	});
});

describe('unwrapObject', () => {
	test('extracts values from object', () => {
		const doc = { key: { _value: 'value', _hlc: 'clock-is-something' as HLC } };
		expect(unwrapObject<typeof objectSchema>(doc)).toEqual({ key: 'value' });
	});
});
