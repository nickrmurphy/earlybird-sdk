# Core Package Tests

This directory contains tests for the core package, organized to minimize redundancy while maintaining comprehensive coverage.

## Test Structure

- `storage/exports.test.ts` - Comprehensive tests for the storage module including:
  - Export verification (both from storage module and main package)
  - StorageAdapter interface type checking and runtime behavior
  - StorageError class functionality and factory methods
  - StorageErrorCode enum values

## Running Tests

```bash
# Run tests with coverage (default)
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with verbose coverage
bun run test:coverage:verbose

# Type checking only
bun run typecheck
```

## Coverage

The test suite maintains 100% code coverage across all source files:
- `index.ts` - Main package exports
- `src/index.ts` - Source index
- `src/storage/errors.ts` - Error classes and enums
- `src/storage/index.ts` - Storage module exports

## Test Philosophy

Tests are organized by module and functionality rather than implementation details. Each test serves a specific purpose:

1. **Export Tests** - Verify all public APIs are properly exported
2. **Runtime Behavior Tests** - Verify actual behavior matches type definitions
3. **Error Handling Tests** - Test error creation and factory methods

This approach eliminates redundant tests while ensuring comprehensive coverage of both compile-time and runtime behavior.
