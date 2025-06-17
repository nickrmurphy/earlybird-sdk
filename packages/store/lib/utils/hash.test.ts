import { describe, expect, it } from 'vitest';
import { hash, hashObject } from './hash';

describe('hash', () => {
	it('should return a string hash for any string', () => {
		const str = 'hello world';
		const hashValue = hash(str);

		expect(typeof hashValue).toBe('string');
		expect(hashValue.length).toBeGreaterThan(0);
	});

	it('should return consistent hashes for the same string', () => {
		const str = 'hello world';
		const hash1 = hash(str);
		const hash2 = hash(str);

		expect(hash1).toBe(hash2);
	});

	it('should return different hashes for different strings', () => {
		const str1 = 'hello world';
		const str2 = 'hello universe';

		expect(hash(str1)).not.toBe(hash(str2));
	});

	it('should handle empty strings', () => {
		const emptyHash = hash('');

		expect(typeof emptyHash).toBe('string');
		expect(emptyHash.length).toBeGreaterThan(0);
	});

	it('should handle unicode characters', () => {
		const unicodeStr = '🚀 Hello 世界 🌍';
		const hashValue = hash(unicodeStr);

		expect(typeof hashValue).toBe('string');
		expect(hashValue.length).toBeGreaterThan(0);
	});
});

describe('hashObject', () => {
	it('should return a string hash for simple objects', () => {
		const obj = { name: 'test', value: 42 };
		const hash = hashObject(obj);

		expect(typeof hash).toBe('string');
		expect(hash.length).toBeGreaterThan(0);
	});

	it('should return consistent hashes for the same object', () => {
		const obj = { name: 'test', value: 42 };
		const hash1 = hashObject(obj);
		const hash2 = hashObject(obj);

		expect(hash1).toBe(hash2);
	});

	it('should return same hash regardless of property order', () => {
		const obj1 = { name: 'test', value: 42 };
		const obj2 = { value: 42, name: 'test' };

		expect(hashObject(obj1)).toBe(hashObject(obj2));
	});

	it('should return different hashes for different objects', () => {
		const obj1 = { name: 'test', value: 42 };
		const obj2 = { name: 'test', value: 43 };

		expect(hashObject(obj1)).not.toBe(hashObject(obj2));
	});

	it('should handle nested objects', () => {
		const obj = {
			user: { name: 'test', age: 25 },
			settings: { theme: 'dark' },
		};
		const hash = hashObject(obj);

		expect(typeof hash).toBe('string');
		expect(hash.length).toBeGreaterThan(0);
	});

	it('should handle arrays', () => {
		const obj = { items: [1, 2, 3], tags: ['a', 'b'] };
		const hash = hashObject(obj);

		expect(typeof hash).toBe('string');
		expect(hash.length).toBeGreaterThan(0);
	});

	it('should handle null and undefined values', () => {
		const obj = { name: null, value: undefined, active: true };
		const hash = hashObject(obj);

		expect(typeof hash).toBe('string');
		expect(hash.length).toBeGreaterThan(0);
	});
});
