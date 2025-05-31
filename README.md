# Early Bird SDK

A simple, type-safe storage solution for local-first apps that works natively in browsers. Built on CRDTs for conflict-free sync with zero external dependencies.

## Key Benefits
- 🌐 **Web-first** - Pure browser APIs, no compilation complexity
- 🔄 **Conflict-free sync** - Automatic resolution across devices using CRDTs
- 📝 **Type-safe** - Full TypeScript support with Standard Schema validation
- 🪶 **Zero dependencies** - No external runtime dependencies required
- 🧪 **Testing-friendly** - In-memory adapter for unit tests
- 📁 **Human-readable** - Files stored as JSON for easy debugging

## Philosophy
- Minimal dependencies
- Simplicity through thoughtful design
- Unapologetically web-first
- Unapologetically client-first

## Architecture

Three simple layers:

1. **Storage Adapter** - Filesystem abstraction (IndexedDB + in-memory)
2. **CRDT Store** - Document store with conflict-free field updates
3. **Database API** - High-level operations and sync coordination

## Project Goals
This project aims to build a library of utilities that help users to build local-first and end-to-end encrypted applications.

- [ ] Storage foundation with IndexedDB persistence
- [ ] CRDT-based document store with conflict resolution
- [ ] Type-safe operations with schema validation
- [ ] Private data synchronization across devices

## Quick Example

```typescript
import { IndexedDBStorageAdapter, CRDTStore } from '@earlybird-sdk/storage';

// Create storage adapter
const adapter = new IndexedDBStorageAdapter('my-app');

// Create type-safe document store
const userStore = new CRDTStore(adapter, 'users', UserSchema);

// Insert with automatic conflict resolution
const user = await userStore.insert('alice-123', {
  name: 'Alice Smith',
  email: 'alice@example.com'
});

// Updates automatically resolve conflicts across devices
await userStore.update('alice-123', 'email', 'alice@newcompany.com');
```

## Status

**Phase 1: Storage Foundation** ✅ Nearly Complete
- [x] Storage adapter interface and implementations
- [ ] IndexedDB persistence layer
- [x] In-memory testing adapter
- [x] Hybrid Logical Clock utilities
- [ ] Basic CRDT store implementation

**Next**: Phase 2 focuses on schema system and validation integration.

See [PROPOSAL.md](./PROPOSAL.md) for detailed technical design and roadmap.

