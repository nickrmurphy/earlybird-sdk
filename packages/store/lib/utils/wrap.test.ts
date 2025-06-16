import type { HLC } from './hlc';

import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { createClock } from './hlc';
import { unwrapDoc, unwrapField, wrapDoc, wrapField } from './wrap';

const stringSchema = z.string();
const objectSchema = z.object({
	key: z.string(),
});

describe('wrap', () => {
	test('wraps value with clock', () => {
		const clock = createClock();
		const result = wrapField<typeof stringSchema>('test', clock);
		expect(result.$value).toBe('test');
		expect(result.$hlc).toBeDefined();
	});
});

describe('wrapObject', () => {
	test('wraps object values', () => {
		const clock = createClock();
		const result = wrapDoc<typeof objectSchema>({ key: 'value' }, clock);
		expect(result.$value.key.$value).toBe('value');
	});
});

describe('unwrap', () => {
	test('extracts value from field', () => {
		const field = { $value: 'test', $hlc: 'clock-is-something' as HLC };
		expect(unwrapField<typeof stringSchema>(field)).toBe('test');
	});
});

describe('unwrapObject', () => {
	test('extracts values from object', () => {
		const doc = {
			$hash: '123',
			$value: { key: { $value: 'value', $hlc: 'clock-is-something' as HLC } },
		};
		expect(unwrapDoc<typeof objectSchema>(doc)).toEqual({ key: 'value' });
	});
});
