# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm test` - Run tests across all packages
- `pnpm test:coverage` - Generate coverage reports for all packages
- `pnpm bench` - Run performance benchmarks across all packages
- `pnpm build` - Build all packages
- `pnpm lint` - Check code with Biome
- `pnpm lint:fix` - Auto-fix linting issues

### Package-specific (from package directories)
- `pnpm test` - Run Vitest tests for specific package
- `pnpm test:coverage` - Generate coverage report for specific package
- `pnpm bench` - Run Vitest benchmarks for specific package
- `pnpm dev` - Start Vite dev server (demo client only)

### Testing individual files
- `pnpm test <file-pattern>` - Run specific test files
- `pnpm bench <file-pattern>` - Run specific benchmark files

## Architecture

This is a monorepo SDK (`@byearlybird/sdk`) for cross-platform data storage with the following key architectural patterns:

### Storage Layer (`/packages/store/storage/`)
- **Adapter Pattern**: Abstract `StorageAdapter` interface with multiple implementations
  - Memory adapter (in-memory storage)
  - IndexedDB adapter (browser database)
- **Consistent API**: All adapters implement `loadData()`, `saveData()`, `loadHLC()`, `saveHLC()`, and listener methods
- **Platform Abstraction**: Enables the same store logic to work across Node.js and browser

### Store Layer (`/packages/store/store/`)
- **Factory Pattern**: `createStore(collection, config)` creates type-safe store instances
- **Schema Validation**: Uses Zod schemas with `StandardSchemaV1` interface for runtime type checking
- **CRUD Operations**: `get()`, `all()`, `create()`, `update()`, `merge()` methods with consistent error handling

### CRDT Implementation (`/packages/store/lib/crdt/`)
- **Hybrid Logical Clock (HLC)**: Provides total ordering for conflict resolution across distributed instances
- **Last-Writer-Wins**: Field-level conflict resolution using HLC timestamps
- **Document Hashing**: Each document has a content hash for efficient change detection
- **Merge Logic**: Pure functions for merging conflicting CRDT documents

### Synchronization System
- **Hash-Based Sync**: Root hash and bucket hashes enable efficient change detection
- **Bucket System**: Documents are organized into buckets (100 docs per bucket) for selective synchronization
- **Document Exchange**: `getDocumentsByBucket()` returns `Record<string, CRDTDoc<T>>` for merging
- **Integration Tests**: Comprehensive test suite covers conflict resolution, empty store sync, and incremental synchronization

### React Bindings (`/packages/store-react/`)
- **Store Provider**: Context-based store management for React applications
- **Custom Hooks**: `useStore()`, `useDocument()`, `useQuery()` for reactive data access
- **Type Safety**: Full TypeScript integration with schema validation

### Key Design Principles
- **Type Safety**: Full TypeScript with strict configuration and runtime validation
- **Performance**: Includes comprehensive benchmark suite tracking 10k+ operation performance
- **Modularity**: Clean separation between storage adapters, CRDT logic, and business logic
- **Cross-platform**: Single codebase works across Node.js and browser
- **Conflict-Free**: CRDT architecture ensures data consistency across distributed instances

## Testing Strategy

### Dual Environment Testing
- **Browser Tests**: Vitest with Playwright for browser-specific functionality (IndexedDB)
- **Node.js Tests**: Vitest for server-side functionality (Memory adapter)
- **Integration Tests**: End-to-end CRDT synchronization scenarios with multiple store instances
- **Benchmarks**: Performance tracking for 10k+ operations across all adapters

### Test Patterns
- **Adapter Testing**: Consistent test suite across all storage adapters
- **CRDT Conflict Resolution**: Tests for concurrent modifications and merge scenarios
- **Hash Synchronization**: Tests for bucket-based document exchange and hash comparison
- **Empty Store Sync**: Tests for new client onboarding scenarios

## Code Style
- **Formatter**: Biome with tab indentation and single quotes
- **Import Organization**: Auto-organized imports enabled
- **TypeScript**: Strict configuration with ESNext target
- **Workspace Dependencies**: Use `workspace:*` for internal package references