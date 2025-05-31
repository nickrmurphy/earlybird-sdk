# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Package (`packages/core/`)
```bash
# Run tests with type checking and coverage
bun run test

# Watch mode for tests during development  
bun run test:watch

# Generate test coverage reports
bun run test:coverage
bun run test:coverage:verbose

# Type checking only
bun run typecheck
```

### Build and Quality
```bash
# Type check the entire workspace
bun run typecheck

# Lint (command not yet configured - check package.json for future updates)
```

## Project Architecture

### Monorepo Structure
- **Root**: Bun workspace with minimal dependencies philosophy
- **packages/core**: Main SDK package containing storage abstractions
- **apps/demo**: Demo application for testing implementations
- **plans/**: Detailed implementation plans and GitHub issue templates

### Storage Foundation (Phase 1)
The project is currently implementing a foundational storage layer in `packages/core/src/storage/`:

**Core Interface**: `StorageAdapter` provides unified async API for file operations:
- `read(path: string): Promise<string | null>`
- `write(path: string, content: string): Promise<void>`  
- `delete(path: string): Promise<void>`
- `exists(path: string): Promise<boolean>`
- `list(directory: string): Promise<string[]>`

**Error Handling**: Custom `StorageError` class with specific error codes (`NOT_FOUND`, `OPERATION_FAILED`)

**Current Implementations**:
- Storage interface and error types are complete
- Working toward InMemoryStorageAdapter and CapacitorStorageAdapter implementations

### Project Philosophy
- **Minimal dependencies**: Keep external deps to absolute minimum
- **Web-first**: Prioritize web platform compatibility
- **Client-first**: Design for client-side usage patterns  
- **Type safety**: Full TypeScript with strict typing
- **Local-first**: Supporting local-first and E2E encrypted applications

### Future Architecture
Based on phase planning, the storage foundation will support:
- CRDT Store implementation (Phase 2)
- Private data synchronization
- Cross-platform persistence (Web + Capacitor mobile)

## Testing Strategy

### Test Organization
- **Unit tests**: `packages/core/tests/` with coverage reports
- **Shared test suites**: Validate StorageAdapter compliance across implementations
- **Integration tests**: Cross-adapter compatibility testing

### Running Tests
Always run `bun run test` which includes type checking before test execution. Coverage reports help track completeness of storage interface implementations.

## Key Implementation Notes

### Storage Adapters
When implementing new storage adapters:
1. Must implement all `StorageAdapter` interface methods
2. Use `StorageError` class for error handling with appropriate error codes
3. Follow async patterns - all operations return Promises
4. Path handling should be normalized for cross-platform compatibility
5. Use shared test suite to validate interface compliance

### Development Workflow
1. Run `bun run typecheck` to ensure TypeScript compliance
2. Use `bun run test:watch` during development
3. Verify coverage with `bun run test:coverage` before commits
4. Check `plans/` directory for detailed implementation guidance

### Package Structure
- Export all public APIs through `src/index.ts`
- Storage module exports through `src/storage/index.ts`  
- Keep implementation files focused and well-documented
- Follow existing JSDoc patterns for public APIs