export type MutationListener = (type: 'insert' | 'update', id: string) => void;

export type Store<T> = {
	get: (id: string) => Promise<T | null>;
	all: (predicate?: (data: T) => boolean) => Promise<T[]>;
	insert: (id: string, data: T) => Promise<void>;
	update: (id: string, data: Partial<T>) => Promise<void>;
	addListener: (key: string, listener: MutationListener) => void;
	removeListener: (key: string) => void;
};
