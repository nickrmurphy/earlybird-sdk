/**
 * Error codes for storage operations
 */
export enum StorageErrorCode {
	/** The requested file or path was not found */
	NOT_FOUND = "NOT_FOUND",
	/** The storage operation failed for an unknown reason */
	OPERATION_FAILED = "OPERATION_FAILED",
}

/**
 * Base error class for all storage-related errors
 */
export class StorageError extends Error {
	/**
	 * The specific error code indicating the type of failure
	 */
	public readonly code: StorageErrorCode;

	/**
	 * The original error that caused this storage error, if any
	 */
	public readonly cause?: Error;

	/**
	 * Creates a new StorageError
	 * @param message - Human-readable error message
	 * @param code - Specific error code
	 * @param cause - Optional underlying error that caused this failure
	 */
	constructor(message: string, code: StorageErrorCode, cause?: Error) {
		super(message);
		this.name = "StorageError";
		this.code = code;
		this.cause = cause;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, StorageError);
		}
	}

	/**
	 * Creates a StorageError for file not found scenarios
	 * @param path - The path that was not found
	 * @param cause - Optional underlying error
	 */
	static notFound(path: string, cause?: Error): StorageError {
		return new StorageError(
			`File not found: ${path}`,
			StorageErrorCode.NOT_FOUND,
			cause,
		);
	}

	/**
	 * Creates a StorageError for general operation failures
	 * @param operation - The operation that failed
	 * @param cause - Optional underlying error
	 */
	static operationFailed(operation: string, cause?: Error): StorageError {
		return new StorageError(
			`Storage operation failed: ${operation}`,
			StorageErrorCode.OPERATION_FAILED,
			cause,
		);
	}
}
