# Early Bird SDK

A simple, type-safe storage solution for local-first apps that works natively in browsers. Built on CRDTs for conflict-free sync with zero external dependencies.

## Key Benefits
- 🌐 **Web-first** - Pure browser APIs, no compilation complexity
- 🔄 **Conflict-free sync** - Automatic resolution across devices using CRDTs
- 📝 **Type-safe** - Full TypeScript support with Standard Schema validation
- 🪶 **Zero dependencies** - No external runtime dependencies required
- 📁 **Human-readable** - Files stored as JSON for easy debugging

## Philosophy
- Minimal dependencies
- Simplicity through thoughtful design
- Unapologetically web-first
- Unapologetically client-first

## Architecture

Three simple layers:

1. **Storage Adapter** - Filesystem abstraction (i.e. Capacitor, NodeFS, etc.)
2. **CRDT Store** - Document store with conflict-free field updates
3. **Sync Client** - High-level operations and sync coordination

## Store Data

```typescript
import {
  createCapacitorAdapter,
  createClient,
  createStore,
} from "@earlybird-sdk/store";

import {  Filesystem } from "@capacitor/filesystem";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

// Create storage adapter
const storageAdapter = createCapacitorAdapter({
  fs: Filesystem,
});

// Create a typed store
const todoStore = createStore<Todo>(storageAdapter, "todos");

// Insert with automatic conflict resolution
const user = await todoStore.insert(crypto.randomUUID(), {
  title: 'Write documentation',
  completed: false,
});

// Updates automatically resolve conflicts
await todoStore.update(crypto.randomUUID(), { completed: true });
```

## Sync Data

```typescript
import { createClient } from "@earlybird-sdk/store";

// Create a sync client
const client = createClient(todoStore, {
  baseUrl: "http://localhost:3000",
});

// Pull and push data as needed
await client.pull();
await client.push();

// Set polling intervals to automatically stay in sync (Optional)
setInterval(async () => {
  await Promise.all([client.pull(), client.push()]);
}, 5000);
```

---

# Milestones

## 1. Single User Database Sync
**Status**: In Progress

**Description**: Basic local-first storage with full stack synchronization

**Goals**:
- Local storage with CRDTs for conflict resolution
- Basic HTTP sync endpoints
- Single database per user architecture
- Full stack implementation (client + server)

---

## 2. Multi-user Server Store
**Status**: Planning

**Description**: Scale to support multiple users on a single server instance while maintaining isolated databases.

**Goals**:
- Multi-tenant server architecture
- User authentication and authorization
- Database isolation per user
- Performance optimization for multiple users

---

## 3. End-to-End Encryption (E2EE)
**Status**: Planning

**Description**: Implement client-side encryption to ensure data privacy and security.

**Goals**:
- Client-side encryption before sync
- Key management system
- Zero-knowledge server architecture
- Maintain CRDT functionality with encrypted data

---

## 4. Real-time Updates
**Status**: Planning

**Description**: Real-time notifications and reactive updates using WebSocket connections.

**Goals**:
- WebSocket notification system
- Reactive data invalidation
- Efficient update propagation
- Graceful fallback to polling

**Notes**: Implements the hybrid HTTP + WebSocket sync strategy outlined in SYNC.md

---

## 5. Schema Validation Hooks
**Status**: Planning

**Description**: Add runtime validation and transformation hooks for data integrity.

**Goals**:
- Standard Schema integration
- Runtime validation hooks
- Data transformation pipelines
- Type-safe validation errors

---

## 6. Document Sharing
**Status**: Future

**Description**: Enable sharing documents between users.

**Goals**:
- Cross-user document access
- Permission management system
- Shared document conflict resolution
---
