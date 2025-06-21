// Re-export Standard Schema types from dedicated file
export type { StandardSchemaV1 } from '../standard-schema.types';
import type { StandardSchemaV1 } from '../standard-schema.types';

export interface HLC {
	current(): string;
	tick(): string;
	advance(timestamp: string): void;
}

export type Entity = { id: string };

// Schema that validates to Entity-compatible output
// biome-ignore lint/suspicious/noExplicitAny: True any use-case
export type EntitySchema<T extends Entity = Entity> = StandardSchemaV1<any, T>;

export type Document<T extends Entity> = {
	$id: string;
	$data: T;
	$hash: string;
	$timestamp: string;
	$timestamps: {
		[K in keyof T]: string;
	};
};

export type DocumentFromSchema<S extends EntitySchema> = Document<
	EntityFromSchema<S>
>;

export type DatabaseConfig = {
	name: string;
	version: number;
	// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any for StandardSchemaV1
	stores: Record<string, StandardSchemaV1<any, any>>;
};

export type TypedDatabase<TConfig extends DatabaseConfig> = IDBDatabase & {
	_config?: TConfig; // Phantom type for compile-time type checking only
};

// Core utility types
export type StoreKey<TConfig extends DatabaseConfig> = keyof TConfig['stores'] &
	string;

export type StoreSchema<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
> = TConfig['stores'][TStoreName];

// Data types (input/output from schemas)
export type StoreData<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
> = StandardSchemaV1.InferInput<TConfig['stores'][TStoreName]>;

// Document types (wrapped with CRDT metadata)
export type StoreDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
> = DocumentFromSchema<TConfig['stores'][TStoreName]>;

// Context types for different use cases
export type WriteContext<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
> = {
	db: TypedDatabase<TConfig>;
	storeName: TStoreName;
	schema: StoreSchema<TConfig, TStoreName>;
	hlc: Pick<HLC, 'tick'>;
};

export type ReadContext<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
> = {
	db: TypedDatabase<TConfig>;
	storeName: TStoreName;
};

/**
 * Extracts the entity type from an EntitySchema.
 */
export type EntityFromSchema<S extends EntitySchema> = S extends EntitySchema<
	infer T
>
	? T
	: never;
