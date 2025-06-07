# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Level (pnpm workspace)

- `pnpm test` - Run tests across all packages using Vitest
- `pnpm test:ui` - Run tests with UI and coverage watching
- `pnpm test:coverage` - Generate coverage reports

### Demo Client (`apps/demo-client/`)

- `pnpm dev` - Start development server on port 3001
- `pnpm build` - Build for production (runs vite build && tsc)
- `pnpm serve` - Preview production build
- `pnpm test` - Run tests with Vitest

### Demo Server (`apps/demo-server/`)

- `pnpm dev` - Start development server with tsx watch on port 3000
- `pnpm build` - Compile TypeScript to dist/
- `pnpm start` - Run compiled server from dist/

## Architecture Overview

Earlybird SDK is a local-first data synchronization framework that enables offline-capable applications with real-time
sync. The project demonstrates CRDT (Conflict-free Replicated Data Types) based data storage with bidirectional
client-server synchronization.

### Core Components

**@earlybird-sdk/store** (`packages/store/`)

- **CRDT Implementation**: Conflict-free replicated data types for distributed data consistency
- **HLC (Hybrid Logical Clock)**: Vector clock implementation for ordering events in distributed systems
- **Storage Adapters**: Multiple storage backends (Node.js filesystem, Capacitor, LibSQL)
- **Sync Client**: Push/pull synchronization with remote servers
- **Store Factory**: High-level API for creating typed stores with adapters

**Demo Applications**

- **Client**: React 19 + TanStack Router application showcasing todo management with offline sync
- **Server**: Hono-based API server providing sync endpoints for hash comparison and bucket fetching

### Data Flow Architecture

1. **Local Storage**: Data persists locally using configurable adapters (filesystem, Capacitor, etc.)
2. **CRDT Operations**: All mutations go through CRDT layer ensuring conflict-free merging
3. **Hybrid Logical Clocks**: Events are timestamped with vector clocks for causal ordering
4. **Hash-based Sync**: Client and server exchange merkle-tree style hashes to identify differences
5. **Bucket Synchronization**: Only changed data buckets are transferred during sync operations

### Key Technologies

- **TypeScript** with strict configuration across all packages
- **Vitest** for testing with coverage reporting and UI
- **PNPM Workspaces** for monorepo package management
- **Vite** for build tooling in client applications
- **Hono** for lightweight HTTP server framework
- **TanStack Router** for file-based routing with type safety

### Development Patterns

- **Workspace Dependencies**: Use `workspace:*` for internal package references
- **Adapter Pattern**: Storage adapters provide consistent interface across platforms
- **Factory Pattern**: Store and client creation through factory functions
- **Type Safety**: Full TypeScript coverage with generic store types
- **Conflict Resolution**: Automatic via CRDT, no manual merge conflict handling needed
- **Functional Core, Imperative Shell**: Business logic separated into pure functions (functional core) with I/O operations handled by coordinating functions (imperative shell). This pattern improves testability, reasoning, and maintainability by isolating side effects from pure business logic.

### Sync Protocol

The sync process follows a hash-based differential algorithm:

1. Client requests current hashes from server (`/:collection/hashes`)
2. Server responds with merkle-tree style hash structure
3. Client compares local vs remote hashes to identify changed buckets
4. Client requests specific buckets (`/:collection?buckets=[1,2,3]`)
5. CRDT merge operations handle conflict resolution automatically

### Testing Strategy

- **Unit Tests**: Comprehensive coverage for CRDT operations, HLC logic, and storage adapters
- **Integration Tests**: Store factory and sync client integration scenarios
- **Coverage Reporting**: V8 provider with HTML, JSON, and text output formats
- **Test Structure**: Co-located test files with `.test.ts` suffix
