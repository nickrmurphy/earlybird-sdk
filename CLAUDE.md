# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Manager**: Use `pnpm` (not npm/yarn)

### Common Commands
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests across all packages
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run benchmarks
pnpm bench

# Lint with Biome
pnpm lint

# Auto-fix linting issues
pnpm lint:fix
```

### Package-Specific Commands
```bash
# Work with specific packages
pnpm --filter @byearlybird/store test
pnpm --filter @byearlybird/store build

# Run demo applications
cd apps/demo-react && pnpm dev
cd apps/demo-solid && pnpm dev
```

### Testing
- **Framework**: Vitest
- **Core store package**: Uses browser-based testing with Playwright
- **Location**: `*.test.ts` files alongside source code
- **Coverage**: 80% lines/functions, 70% branches required

## Architecture

**Early Bird SDK** is a local-first data storage solution using CRDTs (Conflict-free Replicated Data Types).

### Monorepo Structure
- `packages/store/` - Core CRDT document store (zero runtime dependencies)
- `packages/store-react/` - React hooks and components
- `packages/demo-shared/` - Shared schemas and configuration
- `packages/demo-styles/` - Reusable CSS components
- `apps/demo-react/` - React demo application
- `apps/demo-solid/` - SolidJS demo application

### Key Technologies
- **Build**: Vite for all packages and apps
- **Linting**: Biome (not ESLint/Prettier)
- **TypeScript**: Strict mode, ESNext modules
- **Styling**: TailwindCSS v4
- **Schema Validation**: Supports Zod and Valibot

### CRDT Implementation
Three-layer architecture:
1. **Storage Adapters**: IndexedDB, Memory (`/packages/store/lib/storage/`)
2. **CRDT Store**: Document store with Hybrid Logical Clocks (`/packages/store/lib/crdt/`)
3. **Sync Client**: High-level operations (`/packages/store/lib/client/`)

### Important Files
- `packages/store/lib/crdt/document.ts` - Core CRDT document operations
- `packages/store/lib/crdt/hlc.ts` - Hybrid Logical Clock implementation
- `packages/store/lib/utils/timestamps.ts` - Timestamp utilities for conflict resolution

## Code Style

Enforced by Biome:
- Tab indentation
- Single quotes
- Recommended rules enabled
- Organizes imports automatically

## Development Workflow

1. **Local Development**: Use development exports that point directly to TypeScript files
2. **Building**: ES modules only, with TypeScript declaration files
3. **Testing**: Browser-based testing for core store, regular Vitest for other packages
4. **Dependencies**: Zero runtime dependencies for core store package