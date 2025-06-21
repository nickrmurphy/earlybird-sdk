// #region Standard Schema Types
/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
    /** The Standard Schema properties. */
    readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
    /** The Standard Schema properties interface. */
    export interface Props<Input = unknown, Output = Input> {
        /** The version number of the standard. */
        readonly version: 1;
        /** The vendor name of the schema library. */
        readonly vendor: string;
        /** Validates unknown input values. */
        readonly validate: (
            value: unknown
        ) => Result<Output> | Promise<Result<Output>>;
        /** Inferred types associated with the schema. */
        readonly types?: Types<Input, Output> | undefined;
    }

    /** The result interface of the validate function. */
    export type Result<Output> = SuccessResult<Output> | FailureResult;

    /** The result interface if validation succeeds. */
    export interface SuccessResult<Output> {
        /** The typed output value. */
        readonly value: Output;
        /** The non-existent issues. */
        readonly issues?: undefined;
    }

    /** The result interface if validation fails. */
    export interface FailureResult {
        /** The issues of failed validation. */
        readonly issues: ReadonlyArray<Issue>;
    }

    /** The issue interface of the failure output. */
    export interface Issue {
        /** The error message of the issue. */
        readonly message: string;
        /** The path of the issue, if any. */
        readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
    }

    /** The path segment interface of the issue. */
    export interface PathSegment {
        /** The key representing a path segment. */
        readonly key: PropertyKey;
    }

    /** The Standard Schema types interface. */
    export interface Types<Input = unknown, Output = Input> {
        /** The input type of the schema. */
        readonly input: Input;
        /** The output type of the schema. */
        readonly output: Output;
    }

    /** Infers the input type of a Standard Schema. */
    export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
        Schema['~standard']['types']
    >['input'];

    /** Infers the output type of a Standard Schema. */
    export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
        Schema['~standard']['types']
    >['output'];
}

// #endregion Standard Schema Types

export type HLC = {
    current: () => string;
    tick: () => string;
    advance: (timestamp: string) => void;
};


export type Entity = { id: string };

// Schema that validates to Entity-compatible output
// biome-ignore lint/suspicious/noExplicitAny: True any use-case
export type EntitySchema<T extends Entity = Entity> = StandardSchemaV1<any, T>;

export type Document<T extends Entity> = {
    $id: string;
    $data: T;
    $hash: string;
    $timestamps: {
        [K in keyof T]: string;
    }
};

export type DocumentFromSchema<S extends EntitySchema> =
    S extends EntitySchema<infer T>
    ? Document<T>
    : never;

export type DatabaseConfig = {
    name: string;
    version: number;
    // biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any for StandardSchemaV1
    stores: Record<string, StandardSchemaV1<any, any>>;
}

export type TypedDatabase<TConfig extends DatabaseConfig> = IDBDatabase & {
    _config?: TConfig; // Phantom type for compile-time type checking only
};