# Earlybird SDK Storage Solution

## Overview

A simple, type-safe storage solution for local-first apps that works identically on web and native platforms. Built on CRDTs for conflict-free sync with minimal dependencies.

**Key Benefits:**
- 🌐 Unapologetically web-first with IndexedDB persistence
- 🔄 Automatic conflict resolution across devices
- 📝 Full TypeScript support with Standard Schema validation
- 🪶 Zero external dependencies for core functionality
- 🧪 Easy testing with in-memory adapter
- 📁 Human-readable file storage

## The Problem

Local-first apps need storage that:
- Syncs across devices without conflicts
- Works natively in browsers without complexity
- Provides type safety and schema evolution
- Maintains simple mental models

## The Solution

### Architecture

Three simple layers:

1. **Storage Adapter** - Filesystem abstraction (enables testing)
2. **CRDT Store + Schema System** - Document store with conflict-free field updates and validation
3. **Database API** - High-level operations and sync coordination

### Core Concepts

- **Documents not tables** - Each entity is a self-contained JSON file
- **Collections not relations** - Logical grouping via directories
- **Field-level CRDTs** - Conflict resolution per field, not per document
- **Hybrid Logical Clocks** - Ordering updates across devices
- **State-based sync** - Efficient field metadata instead of operation logs

## Technical Design

### 1. Storage Adapter

Minimal filesystem abstraction that enables testing:

```typescript
interface StorageAdapter {
  read(path: string): Promise<string | null>;
  write(path: string, data: string): Promise<void>;
  list(directory: string): Promise<string[]>;
  delete(path: string): Promise<void>;
}
```

Two implementations:
- **IndexedDBStorageAdapter** → Production (uses browser IndexedDB)
- **InMemoryStorageAdapter** → Testing (uses `Map<string, string>`)

### 2. CRDT Store

Each document is a JSON file with field-level conflict resolution:

```typescript
interface HybridLogicalClock {
  logical: number;    // Logical counter
  physical: number;   // Wall clock time
  nonce: string;      // Random tie-breaker
}

interface CRDTFieldMetadata {
  value: any;
  hlc: HybridLogicalClock;
}

interface CRDTDocument {
  id: string;
  fields: Record<string, CRDTFieldMetadata>;
  _version: number;
  _createdAt: number;
  _updatedAt: number;
}

class CRDTStore<T> {
  async insert(id: string, data: Partial<T>): Promise<T>
  async update(docId: string, field: string, value: any): Promise<T>
  async merge(docId: string, fields: Record<string, CRDTFieldMetadata>): Promise<T>
  async get(id: string): Promise<T | null>
  async all(): Promise<T[]>
  async delete(id: string): Promise<void>
}
```

**Key Features:**
- Field-level conflict resolution using Hybrid Logical Clocks
- Automatic merging of concurrent updates from different devices
- Bounded storage (no operation logs)
- Type-safe with Standard Schema-compliant validation

### 3. File Structure

Simple directory-per-collection mapping:

```
data/
├── users/
│   ├── alice-123.json
│   └── bob-456.json
├── posts/
│   ├── post-abc.json
│   └── post-def.json
└── settings/
    └── app-config.json
```

**Example Document** (`users/alice-123.json`):
```json
{
  "id": "alice-123",
  "fields": {
    "name": {
      "value": "Alice Smith",
      "hlc": { "logical": 5, "physical": 1704528600000, "nonce": "abc123" }
    },
    "email": {
      "value": "alice@newcompany.com", 
      "hlc": { "logical": 8, "physical": 1704528700000, "nonce": "def456" }
    }
  },
  "_version": 2,
  "_createdAt": 1704528600000,
  "_updatedAt": 1704529000000
}
```

**Performance:**
- Single document: O(1) direct file access
- Collection queries: O(n) scan all documents
- Conflict resolution: O(fields) compare HLC per field

### 4. Schema & Migrations

Type-safe schemas with automatic evolution using [Standard Schema](https://github.com/standard-schema/standard-schema):

```typescript
// Example using Zod (Standard Schema compliant)
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  lastLogin: z.date().optional()
});

type User = z.infer<typeof UserSchema>;

// Works with any Standard Schema-compliant library:
// - Zod (our reference implementation)
// - Valibot  
// - ArkType
// - Yup (with adapter)
// - Joi (with adapter)
// - Custom schemas implementing Standard Schema interface

// Collection with migrations
const userCollection = {
  name: 'users',
  schema: UserSchema,  // Any Standard Schema-compliant validator
  version: 2,
  migrations: [
    {
      from: 1,
      to: 2,
      migrate: (data: any) => ({
        ...data,
        avatar: undefined,  // Add new optional field
        lastLogin: undefined
      })
    }
  ]
};
```

**Standard Schema Interface:**
The system expects schemas that implement the [Standard Schema specification](https://github.com/standard-schema/standard-schema):
- `~standard` property identifying schema type
- `~validate()` method for parsing/validation
- TypeScript type inference support
- Consistent error handling

Migrations run automatically when documents are accessed, ensuring gradual schema evolution.

## Synchronization

### Basic Usage

Simple string references between documents with CRDT-aware operations:

```typescript
// Create stores
const userStore = new CRDTStore(adapter, { name: 'users', version: 1 }, UserSchema);
const postStore = new CRDTStore(adapter, { name: 'posts', version: 1 }, PostSchema);

// Create documents
const user = await userStore.insert('alice-123', {
  name: 'Alice Smith',
  email: 'alice@example.com'
});

const post = await postStore.insert('post-abc', {
  title: 'Hello World',
  content: 'My first post',
  authorId: 'alice-123'  // Simple string reference
});

// Update with automatic conflict resolution
await userStore.update('alice-123', 'email', 'alice@newcompany.com');
await postStore.update('post-abc', 'title', 'Updated Title');

// Query relationships
async function getUserPosts(userId: string) {
  const user = await userStore.get(userId);
  const posts = await postStore.query(post => post.authorId === userId);
  return { user, posts };
}
```

### Whole Dataset Sync

Comprehensive sync system for discovering and syncing entire datasets:

```typescript
// Sync manifests for collection comparison
interface SyncManifest {
  collections: Record<string, CollectionSyncMetadata>;
  generatedAt: HybridLogicalClock;
}

interface CollectionSyncMetadata {
  collectionName: string;
  documentCount: number;
  lastModified: HybridLogicalClock;
  documentSummaries: Record<string, DocumentSyncSummary>;
}

// Database-wide sync coordination
class EarlybirdDatabase {
  async generateSyncManifest(): Promise<SyncManifest>
  async compareManifests(local: SyncManifest, remote: SyncManifest): Promise<SyncPlan>
  async performIncrementalSync(remotePlan: SyncPlan): Promise<SyncResult>
  async getAllChangesSince(sinceHLC: HybridLogicalClock): Promise<CollectionDeltas>
}

// Usage
const db = new EarlybirdDatabase();
db.registerStore('users', userStore);
db.registerStore('posts', postStore);

// Generate manifest for discovery
const manifest = await db.generateSyncManifest();

// Compare with remote and sync differences
const syncPlan = await db.compareManifests(localManifest, remoteManifest);
const result = await db.performIncrementalSync(syncPlan);
```

**Key Features:**
- **Document discovery** → Find which documents need syncing
- **Field-level deltas** → Only sync changed fields with metadata  
- **Conflict-free merging** → Automatic resolution using HLC ordering
- **Persistent sync state** → Track sync progress across sessions
- **Collection manifests** → Efficient whole-dataset comparison

## Implementation Roadmap

### Phase 1: Foundation ✅ MOSTLY COMPLETE
- [x] **Storage Adapter** → Interface + IndexedDB/InMemory implementations
- [x] **HLC Utilities** → Generate, compare, increment operations  
- [ ] **Basic CRDT Store** → Insert, update, get, delete operations
- [x] **Comprehensive Testing** → Unit tests with InMemoryAdapter, HLC validation

### Phase 2: Schema System  
- [ ] **Standard Schema Interface** → Generic validation interface following Standard Schema spec
- [ ] **Zod Implementation** → Primary implementation for development and testing
- [ ] **Migration Engine** → Automatic schema evolution
- [ ] **Collection Management** → Directory-based organization
- [ ] **Testing & Quality** → Unit tests, integration tests, migration scenarios, performance validation

### Phase 3: Sync Core
- [ ] **Document Merging** → Field-level conflict resolution at scale
- [ ] **Manifest Generation** → Collection metadata and summaries
- [ ] **Delta Extraction** → Incremental change detection  
- [ ] **Database Coordination** → Multi-collection sync operations
- [ ] **Testing & Quality** → End-to-end sync scenarios, large dataset benchmarks, conflict resolution validation

### Phase 4: Network Sync (Future)
- [ ] **Transport Layer** → WebRTC/WebSocket/HTTP adapters
- [ ] **Peer Discovery** → Device pairing and authentication
- [ ] **Sync Protocols** → Efficient network synchronization
- [ ] **Conflict Strategies** → Advanced resolution policies  
- [ ] **Testing & Quality** → Network simulation, multi-device testing, security validation

## Deployment Strategy

### Package Structure
```
@earlybird-sdk/storage      # Storage adapters and filesystem abstraction
@earlybird-sdk/store        # CRDT store with schema system and conflict resolution
@earlybird-sdk/sync         # Database API and multi-collection sync coordination
```

### Dependencies
- **Required**: None (uses browser IndexedDB)
- **Dev/Test**: `zod` (our Standard Schema reference implementation), `vitest`, `@types/node`
- **User Choice**: Any [Standard Schema](https://github.com/standard-schema/standard-schema)-compliant library

### Bundle Size Target
- Core package: <15KB gzipped
- Web utilities: <5KB gzipped  
- Zero required runtime dependencies
- Schema library is user's choice (follows Standard Schema)

## Trade-offs & Considerations

### Performance
- **O(n) collection queries** → Acceptable for local-first apps
- **Field-level metadata** → ~2x storage overhead vs raw JSON
- **No indexes** → Keep simple, add later if needed

### Limitations
- **No complex queries** → Use simple filtering functions
- **No transactions** → Document-level atomicity only
- **No referential integrity** → Manual relationship management

### Future Extensions
- **Query indexes** → B-tree files for common queries
- **Compression** → Field-level compression for large values
- **Encryption** → Field-level E2E encryption support
- **Reactive queries** → Observable result sets

## Why This Approach

### ✅ Simplicity First
- Human-readable files for debugging
- Minimal abstraction layers
- Clear mental models

### ✅ Web-Native  
- No compilation complexity - pure browser APIs
- Works in all modern browsers immediately
- IndexedDB provides reliable persistence

### ✅ Type Safety
- Full TypeScript inference
- Runtime validation with Standard Schema-compliant libraries
- Schema evolution without breaking changes

### ✅ Sync-Ready
- Built-in conflict resolution
- Efficient field-level deltas
- Whole dataset discovery

### ✅ Testing-Friendly
- InMemory adapter for unit tests
- Deterministic conflict resolution
- No hidden state or side effects

---

**Next Steps**: Start with Phase 1 implementation, focusing on the storage adapter interface and basic CRDT operations. The layered approach allows incremental development while maintaining a clear separation of concerns.
