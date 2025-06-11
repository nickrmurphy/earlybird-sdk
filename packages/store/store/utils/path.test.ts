import { describe, expect, it } from 'vitest';
import { getCollectionPath, getFilePath } from './path';

describe('path utilities', () => {
	describe('getFilePath', () => {
		it('should generate correct file path for basic collection and id', () => {
			const result = getFilePath('users', 'user123');
			expect(result).toBe('users/user123.json');
		});

		it('should handle collection names with special characters', () => {
			const result = getFilePath('my-collection', 'item_1');
			expect(result).toBe('my-collection/item_1.json');
		});

		it('should handle id with special characters', () => {
			const result = getFilePath('collection', 'item-with-dashes');
			expect(result).toBe('collection/item-with-dashes.json');
		});

		it('should handle numeric id', () => {
			const result = getFilePath('items', '12345');
			expect(result).toBe('items/12345.json');
		});

		it('should handle empty strings', () => {
			const result = getFilePath('', '');
			expect(result).toBe('/.json');
		});

		it('should handle single character collection and id', () => {
			const result = getFilePath('a', 'b');
			expect(result).toBe('a/b.json');
		});

		it('should handle uuid-like ids', () => {
			const uuid = '123e4567-e89b-12d3-a456-426614174000';
			const result = getFilePath('documents', uuid);
			expect(result).toBe(`documents/${uuid}.json`);
		});

		it('should handle nested collection names', () => {
			const result = getFilePath('users/profiles', 'profile123');
			expect(result).toBe('users/profiles/profile123.json');
		});

		it('should handle id with dots', () => {
			const result = getFilePath('config', 'app.settings');
			expect(result).toBe('config/app.settings.json');
		});

		it('should handle very long collection and id names', () => {
			const longCollection = 'a'.repeat(100);
			const longId = 'b'.repeat(100);
			const result = getFilePath(longCollection, longId);
			expect(result).toBe(`${longCollection}/${longId}.json`);
		});
	});

	describe('getCollectionPath', () => {
		it('should generate correct collection path for basic collection', () => {
			const result = getCollectionPath('users');
			expect(result).toBe('users/');
		});

		it('should handle collection names with special characters', () => {
			const result = getCollectionPath('my-collection_with_underscores');
			expect(result).toBe('my-collection_with_underscores/');
		});

		it('should handle numeric collection names', () => {
			const result = getCollectionPath('12345');
			expect(result).toBe('12345/');
		});

		it('should handle empty string', () => {
			const result = getCollectionPath('');
			expect(result).toBe('/');
		});

		it('should handle single character collection', () => {
			const result = getCollectionPath('a');
			expect(result).toBe('a/');
		});

		it('should handle collection with dots', () => {
			const result = getCollectionPath('config.items');
			expect(result).toBe('config.items/');
		});

		it('should handle nested collection names', () => {
			const result = getCollectionPath('users/profiles/settings');
			expect(result).toBe('users/profiles/settings/');
		});

		it('should handle collection with spaces', () => {
			const result = getCollectionPath('my collection');
			expect(result).toBe('my collection/');
		});

		it('should handle very long collection names', () => {
			const longCollection = 'collection'.repeat(20);
			const result = getCollectionPath(longCollection);
			expect(result).toBe(`${longCollection}/`);
		});

		it('should always end with forward slash', () => {
			const testCases = ['users', 'items', 'a', '123', 'special-chars_test'];

			for (const collection of testCases) {
				const result = getCollectionPath(collection);
				expect(result).toMatch(/\/$/);
			}
		});
	});

	describe('path consistency', () => {
		it('should create paths that work together', () => {
			const collection = 'users';
			const id = 'user123';

			const filePath = getFilePath(collection, id);

			// The file path should start with the collection path
			expect(filePath).toMatch(new RegExp(`^${collection}/`));
		});

		it('should handle path separators correctly', () => {
			const collection = 'my/nested/collection';
			const id = 'item';

			const collectionPath = getCollectionPath(collection);
			const filePath = getFilePath(collection, id);

			expect(collectionPath).toBe('my/nested/collection/');
			expect(filePath).toBe('my/nested/collection/item.json');
		});
	});
});
