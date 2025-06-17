import { describe, expect, it, vi } from 'vitest';
import { createListeners } from './listeners';

describe('createListeners', () => {
	it('should register and notify listeners', () => {
		const listeners = createListeners();
		const mockListener = vi.fn();

		listeners.registerListener('test', mockListener);
		listeners.notifyListeners();

		expect(mockListener).toHaveBeenCalledOnce();
	});

	it('should register multiple listeners and notify all', () => {
		const listeners = createListeners();
		const mockListener1 = vi.fn();
		const mockListener2 = vi.fn();

		listeners.registerListener('listener1', mockListener1);
		listeners.registerListener('listener2', mockListener2);
		listeners.notifyListeners();

		expect(mockListener1).toHaveBeenCalledOnce();
		expect(mockListener2).toHaveBeenCalledOnce();
	});

	it('should unregister listeners', () => {
		const listeners = createListeners();
		const mockListener = vi.fn();

		listeners.registerListener('test', mockListener);
		listeners.unregisterListener('test');
		listeners.notifyListeners();

		expect(mockListener).not.toHaveBeenCalled();
	});

	it('should replace listener with same key', () => {
		const listeners = createListeners();
		const mockListener1 = vi.fn();
		const mockListener2 = vi.fn();

		listeners.registerListener('test', mockListener1);
		listeners.registerListener('test', mockListener2);
		listeners.notifyListeners();

		expect(mockListener1).not.toHaveBeenCalled();
		expect(mockListener2).toHaveBeenCalledOnce();
	});

	it('should handle unregistering non-existent listener', () => {
		const listeners = createListeners();

		expect(() => listeners.unregisterListener('nonexistent')).not.toThrow();
	});

	it('should handle notifying with no listeners', () => {
		const listeners = createListeners();

		expect(() => listeners.notifyListeners()).not.toThrow();
	});
});