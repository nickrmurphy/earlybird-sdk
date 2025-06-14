import { useEffect, useState } from 'react';

export function useSessionStorage<T>(key: string, initialValue: T) {
	const [storedValue, setStoredValue] = useState<T>(() => {
		try {
			const item = window.sessionStorage.getItem(key);
			if (item === null) {
				window.sessionStorage.setItem(key, JSON.stringify(initialValue));
				return initialValue;
			}
			return JSON.parse(item);
		} catch (error) {
			return initialValue;
		}
	});

	const setValue = (value: T | ((val: T) => T)) => {
		try {
			const valueToStore =
				value instanceof Function ? value(storedValue) : value;
			setStoredValue(valueToStore);
			window.sessionStorage.setItem(key, JSON.stringify(valueToStore));

			// Dispatch custom event to sync other hook instances
			window.dispatchEvent(
				new CustomEvent('session-storage-change', {
					detail: { key, value: valueToStore },
				}),
			);
		} catch (error) {
			console.error('Error writing to sessionStorage:', error);
		}
	};

	useEffect(() => {
		const handleCustomStorageChange = (e: CustomEvent) => {
			if (e.detail.key === key) {
				setStoredValue(e.detail.value);
			}
		};

		window.addEventListener(
			'session-storage-change',
			handleCustomStorageChange as EventListener,
		);

		return () => {
			window.removeEventListener(
				'session-storage-change',
				handleCustomStorageChange as EventListener,
			);
		};
	}, [key]);

	return [storedValue, setValue] as const;
}
