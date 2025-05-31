/**
 * Storage module exports for the Earlybird SDK
 *
 * This module provides the core storage abstractions including the
 * StorageAdapter interface and error types.
 */

// Core interface
export type { StorageAdapter } from "./StorageAdapter.js";

// Error types and utilities
export { StorageError, StorageErrorCode } from "./errors.js";
