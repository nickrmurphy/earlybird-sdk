import { describe, test, expect } from 'bun:test';
import {
  normalizePath,
  isValidPath,
  getDirectory,
  getFilename,
  joinPath,
} from '../../../src/storage/utils/path.js';

describe('Path Utilities', () => {
  describe('normalizePath', () => {
    test('handles empty and current directory paths', () => {
      expect(normalizePath('')).toBe('');
      expect(normalizePath('.')).toBe('');
      expect(normalizePath('./')).toBe('');
    });

    test('converts backslashes to forward slashes', () => {
      expect(normalizePath('data\\file.txt')).toBe('data/file.txt');
      expect(normalizePath('data\\user\\profile.json')).toBe('data/user/profile.json');
      expect(normalizePath('\\data\\file.txt')).toBe('data/file.txt');
    });

    test('removes leading slashes', () => {
      expect(normalizePath('/data/file.txt')).toBe('data/file.txt');
      expect(normalizePath('//data/file.txt')).toBe('data/file.txt');
      expect(normalizePath('///data/file.txt')).toBe('data/file.txt');
    });

    test('removes trailing slashes', () => {
      expect(normalizePath('data/')).toBe('data');
      expect(normalizePath('data//')).toBe('data');
      expect(normalizePath('data/user/')).toBe('data/user');
    });

    test('collapses multiple consecutive slashes', () => {
      expect(normalizePath('data//file.txt')).toBe('data/file.txt');
      expect(normalizePath('data///user//file.txt')).toBe('data/user/file.txt');
      expect(normalizePath('data////file.txt')).toBe('data/file.txt');
    });

    test('handles complex mixed cases', () => {
      expect(normalizePath('/data\\\\user//file.txt/')).toBe('data/user/file.txt');
      expect(normalizePath('\\\\data///user\\file.txt//')).toBe('data/user/file.txt');
    });

    test('preserves valid simple paths', () => {
      expect(normalizePath('file.txt')).toBe('file.txt');
      expect(normalizePath('data/file.txt')).toBe('data/file.txt');
      expect(normalizePath('data/user/profile.json')).toBe('data/user/profile.json');
    });
  });

  describe('isValidPath', () => {
    test('accepts empty path', () => {
      expect(isValidPath('')).toBe(true);
    });

    test('accepts valid simple paths', () => {
      expect(isValidPath('file.txt')).toBe(true);
      expect(isValidPath('data/file.txt')).toBe(true);
      expect(isValidPath('data/user/profile.json')).toBe(true);
    });

    test('accepts paths with spaces and special characters', () => {
      expect(isValidPath('my file.txt')).toBe(true);
      expect(isValidPath('data/my-file_v2.json')).toBe(true);
      expect(isValidPath('files/image@2x.png')).toBe(true);
    });

    test('rejects null bytes', () => {
      expect(isValidPath('file\x00.txt')).toBe(false);
      expect(isValidPath('data/file\x00name.txt')).toBe(false);
    });

    test('rejects path traversal sequences', () => {
      expect(isValidPath('../file.txt')).toBe(false);
      expect(isValidPath('data/../file.txt')).toBe(false);
      expect(isValidPath('../../etc/passwd')).toBe(false);
      expect(isValidPath('data\\..\\file.txt')).toBe(false);
      expect(isValidPath('..')).toBe(false);
      expect(isValidPath('../')).toBe(false);
      expect(isValidPath('..\\')).toBe(false);
    });

    test('rejects control characters', () => {
      expect(isValidPath('file\x01.txt')).toBe(false);
      expect(isValidPath('file\x1F.txt')).toBe(false);
      expect(isValidPath('file\x7F.txt')).toBe(false);
      expect(isValidPath('data/file\x08name.txt')).toBe(false);
    });

    test('accepts tab, newline, carriage return (might be in filenames)', () => {
      // These are generally allowed in filenames on some systems
      expect(isValidPath('file\tname.txt')).toBe(true);
      expect(isValidPath('file\nname.txt')).toBe(true);
      expect(isValidPath('file\rname.txt')).toBe(true);
    });
  });

  describe('getDirectory', () => {
    test('returns empty string for files in root', () => {
      expect(getDirectory('file.txt')).toBe('');
      expect(getDirectory('data.json')).toBe('');
    });

    test('extracts directory from nested paths', () => {
      expect(getDirectory('data/file.txt')).toBe('data');
      expect(getDirectory('data/user/profile.json')).toBe('data/user');
      expect(getDirectory('a/b/c/d/file.txt')).toBe('a/b/c/d');
    });

    test('handles directory paths', () => {
      expect(getDirectory('data/')).toBe('');
      expect(getDirectory('data/user/')).toBe('data');
    });

    test('normalizes path before extracting directory', () => {
      expect(getDirectory('data\\user\\file.txt')).toBe('data/user');
      expect(getDirectory('/data//user/file.txt')).toBe('data/user');
    });

    test('handles edge cases', () => {
      expect(getDirectory('')).toBe('');
      expect(getDirectory('.')).toBe('');
      expect(getDirectory('./')).toBe('');
    });
  });

  describe('getFilename', () => {
    test('returns full string for files in root', () => {
      expect(getFilename('file.txt')).toBe('file.txt');
      expect(getFilename('data.json')).toBe('data.json');
    });

    test('extracts filename from nested paths', () => {
      expect(getFilename('data/file.txt')).toBe('file.txt');
      expect(getFilename('data/user/profile.json')).toBe('profile.json');
      expect(getFilename('a/b/c/d/file.txt')).toBe('file.txt');
    });

    test('returns filename for normalized directory paths', () => {
      expect(getFilename('data/')).toBe('data');
      expect(getFilename('data/user/')).toBe('user');
    });

    test('normalizes path before extracting filename', () => {
      expect(getFilename('data\\user\\file.txt')).toBe('file.txt');
      expect(getFilename('/data//user/file.txt')).toBe('file.txt');
    });

    test('handles edge cases', () => {
      expect(getFilename('')).toBe('');
      expect(getFilename('.')).toBe('');
      expect(getFilename('./')).toBe('');
    });

    test('handles filenames with special characters', () => {
      expect(getFilename('data/my-file_v2.json')).toBe('my-file_v2.json');
      expect(getFilename('files/image@2x.png')).toBe('image@2x.png');
    });
  });

  describe('joinPath', () => {
    test('joins simple path segments', () => {
      expect(joinPath('data', 'file.txt')).toBe('data/file.txt');
      expect(joinPath('data', 'user', 'profile.json')).toBe('data/user/profile.json');
    });

    test('handles segments with slashes', () => {
      expect(joinPath('data/', 'file.txt')).toBe('data/file.txt');
      expect(joinPath('data', '/file.txt')).toBe('data/file.txt');
      expect(joinPath('data/', '/user/', 'profile.json')).toBe('data/user/profile.json');
    });

    test('filters out empty segments', () => {
      expect(joinPath('data', '', 'file.txt')).toBe('data/file.txt');
      expect(joinPath('', 'data', '', 'file.txt', '')).toBe('data/file.txt');
    });

    test('handles single segment', () => {
      expect(joinPath('file.txt')).toBe('file.txt');
      expect(joinPath('data')).toBe('data');
    });

    test('handles no segments', () => {
      expect(joinPath()).toBe('');
    });

    test('normalizes result', () => {
      expect(joinPath('data\\', '\\user', 'file.txt')).toBe('data/user/file.txt');
      expect(joinPath('/data//', '//user//', 'file.txt')).toBe('data/user/file.txt');
    });

    test('handles complex cases', () => {
      expect(joinPath('data/', '/user/', '/nested/', 'file.txt')).toBe('data/user/nested/file.txt');
      expect(joinPath('', '', 'data', '', 'file.txt', '')).toBe('data/file.txt');
    });
  });

  describe('integration tests', () => {
    test('utilities work together correctly', () => {
      const path = joinPath('data', 'user', 'profile.json');
      expect(path).toBe('data/user/profile.json');
      expect(isValidPath(path)).toBe(true);
      expect(getDirectory(path)).toBe('data/user');
      expect(getFilename(path)).toBe('profile.json');
    });

    test('handles cross-platform paths consistently', () => {
      const windowsPath = 'data\\user\\profile.json';
      const normalized = normalizePath(windowsPath);
      expect(normalized).toBe('data/user/profile.json');
      expect(isValidPath(normalized)).toBe(true);
      expect(getDirectory(normalized)).toBe('data/user');
      expect(getFilename(normalized)).toBe('profile.json');
    });

    test('validates security for constructed paths', () => {
      const maliciousPath = joinPath('data', '../../../etc', 'passwd');
      expect(isValidPath(maliciousPath)).toBe(false);
    });
  });
});