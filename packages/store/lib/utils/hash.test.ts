import { describe, expect, it } from 'vitest';
import { hash, hashObject, combineHashes, accumulateHashes, bucketHashes } from './hash';

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

describe('combineHashes', () => {
	it('should return a string hash when combining two hashes', () => {
		const hash1 = 'abc123';
		const hash2 = 'def456';
		const combined = combineHashes(hash1, hash2);

		expect(typeof combined).toBe('string');
		expect(combined.length).toBeGreaterThan(0);
	});

	it('should return consistent results for the same inputs', () => {
		const hash1 = 'abc123';
		const hash2 = 'def456';
		const combined1 = combineHashes(hash1, hash2);
		const combined2 = combineHashes(hash1, hash2);

		expect(combined1).toBe(combined2);
	});

	it('should be order-sensitive (a,b) !== (b,a)', () => {
		const hash1 = 'abc123';
		const hash2 = 'def456';
		const combined1 = combineHashes(hash1, hash2);
		const combined2 = combineHashes(hash2, hash1);

		expect(combined1).not.toBe(combined2);
	});

	it('should handle empty hash strings', () => {
		const hash1 = '';
		const hash2 = 'abc123';
		const combined = combineHashes(hash1, hash2);

		expect(typeof combined).toBe('string');
		expect(combined.length).toBeGreaterThan(0);
	});

	it('should produce different results for different hash combinations', () => {
		const hash1 = 'abc123';
		const hash2 = 'def456';
		const hash3 = 'ghi789';
		
		const combined1 = combineHashes(hash1, hash2);
		const combined2 = combineHashes(hash1, hash3);

		expect(combined1).not.toBe(combined2);
	});

	it('should work with real hash outputs', () => {
		const str1 = 'hello';
		const str2 = 'world';
		const hash1 = hash(str1);
		const hash2 = hash(str2);
		const combined = combineHashes(hash1, hash2);

		expect(typeof combined).toBe('string');
		expect(combined.length).toBeGreaterThan(0);
		expect(combined).not.toBe(hash1);
		expect(combined).not.toBe(hash2);
	});
});

describe('accumulateHashes', () => {
	it('should return empty string for empty array', () => {
		const result = accumulateHashes([]);
		
		expect(typeof result).toBe('string');
		expect(result).toBe(''); // Empty array reduces to empty string accumulator
	});

	it('should return the single hash for single-item array', () => {
		const singleHash = 'abc123';
		const result = accumulateHashes([singleHash]);
		
		expect(result).toBe(combineHashes('', singleHash));
	});

	it('should accumulate multiple hashes deterministically', () => {
		const hashes = ['hash1', 'hash2', 'hash3'];
		const result1 = accumulateHashes(hashes);
		const result2 = accumulateHashes(hashes);
		
		expect(result1).toBe(result2);
		expect(typeof result1).toBe('string');
		expect(result1.length).toBeGreaterThan(0);
	});

	it('should produce different results for different hash orders', () => {
		const hashes1 = ['hash1', 'hash2', 'hash3'];
		const hashes2 = ['hash3', 'hash2', 'hash1'];
		const result1 = accumulateHashes(hashes1);
		const result2 = accumulateHashes(hashes2);
		
		expect(result1).not.toBe(result2);
	});

	it('should work with real hash outputs', () => {
		const strings = ['hello', 'world', 'test'];
		const hashes = strings.map(s => hash(s));
		const result = accumulateHashes(hashes);
		
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
		expect(hashes.every(h => h !== result)).toBe(true);
	});

	it('should handle large arrays efficiently', () => {
		const largeArray = Array.from({ length: 1000 }, (_, i) => `hash${i}`);
		const result = accumulateHashes(largeArray);
		
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});

describe('bucketHashes', () => {
	it('should return empty object for empty array', () => {
		const result = bucketHashes([], 10);
		
		expect(result).toEqual({});
	});

	it('should create single bucket for array smaller than bucket size', () => {
		const hashes = ['hash1', 'hash2', 'hash3'];
		const result = bucketHashes(hashes, 10);
		
		expect(Object.keys(result)).toHaveLength(1);
		expect(result[0]).toBeDefined();
		expect(typeof result[0]).toBe('string');
	});

	it('should create multiple buckets when array exceeds bucket size', () => {
		const hashes = ['hash1', 'hash2', 'hash3', 'hash4', 'hash5'];
		const result = bucketHashes(hashes, 2);
		
		expect(Object.keys(result)).toHaveLength(3); // Math.ceil(5/2) = 3
		expect(result[0]).toBeDefined(); // bucket 0: hash1, hash2
		expect(result[1]).toBeDefined(); // bucket 1: hash3, hash4
		expect(result[2]).toBeDefined(); // bucket 2: hash5
	});

	it('should produce consistent results for same inputs', () => {
		const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];
		const result1 = bucketHashes(hashes, 2);
		const result2 = bucketHashes(hashes, 2);
		
		expect(result1).toEqual(result2);
	});

	it('should handle bucket size of 1 (each hash in its own bucket)', () => {
		const hashes = ['hash1', 'hash2', 'hash3'];
		const result = bucketHashes(hashes, 1);
		
		expect(Object.keys(result)).toHaveLength(3);
		expect(result[0]).toBe(accumulateHashes(['hash1']));
		expect(result[1]).toBe(accumulateHashes(['hash2']));
		expect(result[2]).toBe(accumulateHashes(['hash3']));
	});

	it('should combine hashes within buckets correctly', () => {
		const hashes = ['hash1', 'hash2', 'hash3'];
		const result = bucketHashes(hashes, 2);
		
		// First bucket should have hash1 and hash2 accumulated
		expect(result[0]).toBe(accumulateHashes(['hash1', 'hash2']));
		// Second bucket should have just hash3 accumulated
		expect(result[1]).toBe(accumulateHashes(['hash3']));
	});

	it('should work with real hash outputs', () => {
		const strings = ['hello', 'world', 'test', 'data'];
		const hashes = strings.map(s => hash(s));
		const result = bucketHashes(hashes, 2);
		
		expect(Object.keys(result)).toHaveLength(2);
		expect(typeof result[0]).toBe('string');
		expect(typeof result[1]).toBe('string');
		expect(result[0]).not.toBe(result[1]);
	});

	it('should handle large arrays with appropriate bucket sizes', () => {
		const largeArray = Array.from({ length: 1000 }, (_, i) => `hash${i}`);
		const result = bucketHashes(largeArray, 100);
		
		expect(Object.keys(result)).toHaveLength(10); // 1000/100 = 10 buckets
		expect(Object.values(result).every(h => typeof h === 'string')).toBe(true);
	});

	it('should be efficient and reuse accumulateHashes logic', () => {
		const hashes = ['a', 'b', 'c', 'd', 'e', 'f'];
		const result = bucketHashes(hashes, 3);
		
		// Should produce same result as manually calling accumulateHashes on slices
		const expected = {
			0: accumulateHashes(['a', 'b', 'c']),
			1: accumulateHashes(['d', 'e', 'f'])
		};
		
		expect(result).toEqual(expected);
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
