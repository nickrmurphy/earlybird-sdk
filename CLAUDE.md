# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `bun test` - Run tests across all packages
- `bun run test:coverage` - Generate coverage reports for all packages
- `bun run bench` - Run performance benchmarks across all packages
- `bun run build` - Build all packages
- `bun run lint` - Check code with Biome
- `bun run lint:fix` - Auto-fix linting issues

### Package-specific (from package directories)
- `bun run test` - Run Vitest tests for specific package
- `bun run test:coverage` - Generate coverage report for specific package
- `bun run bench` - Run Vitest benchmarks for specific package
- `bun run dev` - Start Vite dev server (demo client only)

### Testing individual files
- `bun test <file-pattern>` - Run specific test files
- `bun run bench <file-pattern>` - Run specific benchmark files

## Architecture

This is a monorepo SDK (`@byearlybird/sdk`) for cross-platform data storage with the following key architectural patterns:

### Storage Layer (`/packages/store/storage/`)
- **Adapter Pattern**: Abstract `StorageAdapter` interface with multiple implementations (Memory, Node.js filesystem, Capacitor mobile)
- **Consistent API**: All adapters implement `read()`, `write()`, `list()` methods
- **Platform Abstraction**: Enables the same store logic to work across Node.js, browser, and mobile

### Store Layer (`/packages/store/store/`)
- **Factory Pattern**: `createStore(collection, config)` creates type-safe store instances
- **Schema Validation**: Uses Zod schemas with `StandardSchemaV1` interface for runtime type checking
- **CRUD Operations**: `get()`, `all()`, `insert()`, `update()` methods with consistent error handling

### Key Design Principles
- **Type Safety**: Full TypeScript with strict configuration and runtime validation
- **Performance**: Includes comprehensive benchmark suite tracking 10k+ operation performance
- **Modularity**: Clean separation between storage adapters and business logic
- **Cross-platform**: Single codebase works across Node.js, browser, and Capacitor mobile apps

## Code Style
- **Formatter**: Biome with tab indentation and single quotes
- **Import Organization**: Auto-organized imports enabled
- **TypeScript**: Strict configuration with ESNext target
- **Workspace Dependencies**: Use `workspace:*` for internal package references
