# Earlybird SDK Storage Solution Proposal

## Executive Summary

This proposal outlines a CRDT-enabled, schema-based storage solution for the Earlybird SDK that prioritizes minimal dependencies, simplicity, and web-first design. The solution uses `@capacitor/filesystem` for persistence, Zod for schema validation, and efficient state-based CRDTs with Hybrid Logical Clocks for conflict-free synchronization, providing type-safe operations and sync-ready architecture without the complexity overhead of traditional databases.

## Problem Statement

Building local-first and end-to-end encrypted applications requires a storage solution that:

- Works identically on web and native platforms
- Provides type safety and schema validation
- Supports data migrations as schemas evolve
- Enables conflict-free data synchronization across devices
- Maintains causal consistency with offline-first capabilities
- Maintains minimal dependencies
- Offers simple mental models over complex abstractions
- Enables easy debugging and data inspection

Traditional solutions like SQLite add significant complexity for web deployment, while NoSQL solutions often lack type safety or require heavy dependencies that conflict with our philosophy.

## Proposed Solution

### Core Architecture

A CRDT-enabled document-based storage system built on four key components:

1. **Storage Adapter**: Minimal abstraction over `@capacitor/filesystem` (essential for testing)
2. **CRDT Store**: State-based CRDT document store with Hybrid Logical Clock ordering
3. **Schema Validation**: Zod-powered validation and migrations
4. **Database Layer**: High-level API for application usage and synchronization

### Key Design Principles

- **Documents over Relations**: Each entity is a self-contained CRDT document
- **Collections over Tables**: Logical grouping through directory structure
- **State over Operations**: Efficient field-level CRDT metadata instead of operation logs
- **Validation over Constraints**: Zod runtime validation with compile-time types
- **Migration over Breaking Changes**: Automatic schema evolution
- **Sync over Complexity**: Conflict-free synchronization with simple mental models
- **Simplicity over Performance**: Optimize for developer experience first

## Technical Design

### Storage Adapter Interface

A minimal abstraction over filesystem operations that enables testing and future flexibility:

```typescript
interface StorageAdapter {
  read(path: string): Promise<string | null>;
  write(path: string, data: string): Promise<void>;
  list(directory: string): Promise<string[]>;
  delete(path: string): Promise<void>;
}

// Capacitor implementation
class CapacitorStorageAdapter implements StorageAdapter {
  async read(path: string): Promise<string | null> {
    try {
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      return result.data as string;
    } catch {
      return null;
    }
  }

  async write(path: string, data: string): Promise<void> {
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
  }

  // ... other methods
}

// In-memory implementation for testing
class InMemoryStorageAdapter implements StorageAdapter {
  private files = new Map<string, string>();

  async read(path: string): Promise<string | null> {
    return this.files.get(path) || null;
  }

  async write(path: string, data: string): Promise<void> {
    this.files.set(path, data);
  }

  // ... other methods
}
```

### CRDT Store Implementation

```typescript
import { z } from 'zod';

interface HybridLogicalClock {
  logical: number;
  physical: number;
  nodeId: string;
}

interface CRDTFieldMetadata {
  value: any;
  hlc: HybridLogicalClock;
  actorId: string;
}

interface CRDTDocument {
  id: string;
  fields: Record<string, CRDTFieldMetadata>;
  _version: number;
  _createdAt: number;
  _updatedAt: number;
}

class CRDTStore<T> {
  constructor(
    adapter: StorageAdapter,
    collection: Collection<T>,
    schema: z.ZodSchema<T>,
    nodeId: string
  ) {}

  async updateField(documentId: string, field: string, value: any): Promise<T>
  async mergeDocument(documentId: string, fields: Record<string, CRDTFieldMetadata>): Promise<T>
  async findById(id: string): Promise<T | null>
  async findAll(): Promise<T[]>
  async find(predicate: (item: T) => boolean): Promise<T[]>
  async delete(id: string): Promise<void>
}
```

Each store manages a single document type with:
- **State-based CRDT**: Efficient field-level conflict resolution using Hybrid Logical Clocks
- **Conflict-free merging**: Automatic resolution of concurrent updates across devices
- **Runtime validation**: Zod schema validation with full TypeScript inference
- **Automatic migration handling**: Schema evolution support
- **Type-safe operations**: Full TypeScript inference for all operations
- **Bounded storage**: Fixed size per document regardless of update history

### File Structure

The storage system maps each collection to a directory, and each document to a JSON file within that directory:

```
data/
├── users/
│   ├── alice-123.json
│   ├── bob-456.json
│   └── charlie-789.json
├── posts/
│   ├── post-abc.json
│   ├── post-def.json
│   └── post-ghi.json
└── settings/
    └── app-config.json
```

#### Operation to Filesystem Mapping

Here's how common operations translate to filesystem calls:

**Update Field Operation:**
```typescript
// Code: userStore.updateField('alice-123', 'email', 'alice@newcompany.com')
// Filesystem: Read 'users/alice-123.json', update field with HLC, write back
```

**Find by ID:**
```typescript
// Code: userStore.findById('alice-123')
// Filesystem: Read from 'users/alice-123.json'
```

**Find All:**
```typescript
// Code: userStore.findAll()
// Filesystem:
//   1. List files in 'users/' directory
//   2. Read each .json file
//   3. Parse and validate each document
```

**Query with Predicate:**
```typescript
// Code: userStore.find(user => user.email.endsWith('@example.com'))
// Filesystem:
//   1. List files in 'users/' directory
//   2. Read each .json file
//   3. Parse, validate, and filter each document
```

**Delete:**
```typescript
// Code: userStore.delete('alice-123')
// Filesystem: Delete 'users/alice-123.json'
```

#### Example File Contents

**users/alice-123.json:**
```json
{
  "id": "alice-123",
  "fields": {
    "name": {
      "value": "Alice Smith",
      "hlc": { "logical": 5, "physical": 1704528600000, "nodeId": "device-1" },
      "actorId": "device-1"
    },
    "email": {
      "value": "alice@newcompany.com",
      "hlc": { "logical": 8, "physical": 1704528700000, "nodeId": "device-2" },
      "actorId": "device-2"
    },
    "avatar": {
      "value": "https://example.com/alice.jpg",
      "hlc": { "logical": 3, "physical": 1704528500000, "nodeId": "device-1" },
      "actorId": "device-1"
    },
    "lastLogin": {
      "value": "2024-01-15T10:30:00.000Z",
      "hlc": { "logical": 12, "physical": 1704529000000, "nodeId": "device-2" },
      "actorId": "device-2"
    }
  },
  "_version": 2,
  "_createdAt": 1704528600000,
  "_updatedAt": 1704529000000
}
```

**posts/post-abc.json:**
```json
{
  "id": "post-abc",
  "fields": {
    "title": {
      "value": "Hello World - Updated!",
      "hlc": { "logical": 15, "physical": 1704542500000, "nodeId": "device-1" },
      "actorId": "device-1"
    },
    "content": {
      "value": "This is my first post, now with more content!",
      "hlc": { "logical": 16, "physical": 1704542600000, "nodeId": "device-1" },
      "actorId": "device-1"
    },
    "authorId": {
      "value": "alice-123",
      "hlc": { "logical": 10, "physical": 1704542400000, "nodeId": "device-1" },
      "actorId": "device-1"
    },
    "tags": {
      "value": ["introduction", "hello", "updated"],
      "hlc": { "logical": 17, "physical": 1704542700000, "nodeId": "device-2" },
      "actorId": "device-2"
    }
  },
  "_version": 1,
  "_createdAt": 1704542400000,
  "_updatedAt": 1704542700000
}
```

#### Performance Characteristics

- **Single Document Access**: O(1) - Direct file read by ID
- **Collection Queries**: O(n) - Must read all documents in collection
- **Cross-Collection Queries**: Multiple O(n) operations
- **Conflict Resolution**: O(fields) - Compare HLC per field during merge
- **Storage Overhead**: Bounded - Each field stores value + HLC metadata
- **Sync Efficiency**: High - Only transmit changed fields with metadata
- **Debuggability**: High - Human-readable files, clear conflict resolution data

## Schema and Migration System

### Schema Definition

The system uses Zod for schema validation and TypeScript inference:

```typescript
import { z } from 'zod';

// User schema with validation
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  lastLogin: z.date().optional()
});

// Post schema
const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  tags: z.array(z.string()).default([]),
  createdAt: z.date().default(() => new Date())
});

// TypeScript types automatically inferred
type User = z.infer<typeof UserSchema>;
type Post = z.infer<typeof PostSchema>;
```

### Migration Configuration

```typescript
const userCollection = {
  name: 'users',
  schema: UserSchema,
  version: 2,
  migrations: [
    {
      from: 1,
      to: 2,
      migrate: (data: any) => ({
        ...data,
        avatar: undefined,
        lastLogin: undefined
      })
    }
  ]
};
```

Migrations run automatically when documents are accessed, ensuring gradual schema evolution without breaking existing data.

### Handling References and Synchronization

Instead of formal relationships, use simple string references with CRDT-aware helper methods:

```typescript
import { z } from 'zod';

// Define schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  lastLogin: z.date().optional()
});

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  tags: z.array(z.string()).default([])
});

type User = z.infer<typeof UserSchema>;
type Post = z.infer<typeof PostSchema>;

// Create CRDT stores
const adapter = new CapacitorStorageAdapter();
const userStore = new CRDTStore(adapter, { name: 'users', version: 1 }, UserSchema, 'device-1');
const postStore = new CRDTStore(adapter, { name: 'posts', version: 1 }, PostSchema, 'device-1');

// CRDT operations replace simple save operations
await userStore.updateField('alice-123', 'email', 'alice@newcompany.com');
await postStore.updateField('post-abc', 'title', 'Updated Post Title');

// Helper methods work with CRDT state
async function getUserPosts(userId: string) {
  const user = await userStore.findById(userId);
  const posts = await postStore.find(post => post.authorId === userId);
  return { user, posts };
}

// Sync operations for multi-device support
async function syncUserFromDevice(userId: string, remoteFields: Record<string, CRDTFieldMetadata>) {
  return userStore.mergeDocument(userId, remoteFields);
}

// Extract sync deltas for transmission
async function getUserSyncData(userId: string, sinceHLC?: HybridLogicalClock) {
  const doc = await userStore.getDocument(userId);
  return filterFieldsSince(doc.fields, sinceHLC);
}
```

This approach provides 90% of relationship functionality with 10% of the complexity, plus conflict-free synchronization across devices.

## Benefits

### Alignment with Philosophy

- **Minimal Dependencies**: Only `@capacitor/filesystem` + `zod` (~13kb total)
- **Simplicity**: Clear mental model, predictable CRDT behavior
- **Web-First**: Identical API across web and native platforms
- **Client-First**: All data operations happen locally, sync-ready by design
- **Unapologetically Local-First**: Offline-capable with conflict-free synchronization

### Developer Experience

- **Type Safety**: Full TypeScript support with runtime validation
- **Schema Evolution**: Automatic migrations prevent breaking changes
- **Conflict-Free**: Automatic resolution of concurrent updates
- **Sync-Ready**: Built-in support for multi-device synchronization
- **Debuggability**: Human-readable JSON files with clear conflict resolution metadata
- **Testability**: Easy to mock and test with in-memory adapter
- **Encryption Ready**: Simple to add encryption layer before sync transmission

### Testing and Development

- **Easy Testing**: In-memory adapter enables fast, isolated unit tests
- **No Mocking Required**: Clean interface instead of mocking Capacitor filesystem
- **Deterministic Tests**: Controlled storage state for reproducible test scenarios
- **Fast Test Execution**: In-memory operations eliminate filesystem I/O during testing
- **Test Data Setup**: Simple programmatic creation of test documents and scenarios
- **CI/CD Friendly**: Tests run without requiring Capacitor or mobile device simulation

### Performance Characteristics

- **Lazy Loading**: Only read documents when needed
- **Small Memory Footprint**: No database engine overhead
- **Fast Startup**: No database initialization required
- **Bounded Storage**: Document size is O(fields) not O(operations)
- **Efficient Sync**: Only transmit changed fields with HLC metadata
- **Fast Conflict Resolution**: O(fields) merge operations
- **Predictable Performance**: File operations with deterministic CRDT merging

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] Implement minimal `StorageAdapter` interface
- [ ] Create `CapacitorStorageAdapter` and `InMemoryStorageAdapter` implementations
- [ ] Build basic CRDT document structure
- [ ] Implement Hybrid Logical Clock utilities
- [ ] Add comprehensive tests with in-memory adapter

### Phase 2: CRDT System (Week 2)
- [ ] Implement state-based CRDT store
- [ ] Add field-level update operations
- [ ] Build conflict-free merge operations
- [ ] Test concurrent update scenarios
- [ ] Create HLC ordering and comparison utilities

### Phase 3: Schema Integration (Week 3)
- [ ] Integrate Zod validation with CRDT operations
- [ ] Implement migration system for CRDT documents
- [ ] Add metadata handling (_version, timestamps, HLC)
- [ ] Create schema versioning utilities
- [ ] Test schema evolution scenarios

### Phase 4: Sync & Developer Experience (Week 4)
- [ ] Build high-level database API with sync operations
- [ ] Add sync delta extraction and merge utilities
- [ ] Create TypeScript types and exports
- [ ] Write documentation and examples
- [ ] Add encryption support for sync transmission

### Phase 5: Advanced Features (Week 5)
- [ ] Implement backup/restore functionality
- [ ] Create development tools (CRDT state inspector, conflict visualizer)
- [ ] Performance optimization and benchmarking
- [ ] Add sync protocol helpers for network transmission

## Future Considerations

### Potential Extensions

1. **Indexing**: Add optional index files for common queries
2. **Compression**: Compress large CRDT documents automatically
3. **Advanced Sync Protocols**: WebRTC, WebSocket, or HTTP-based sync implementations
4. **Query Language**: Simple query DSL for complex operations
5. **Transactions**: Coordinated multi-document CRDT operations
6. **Vector Clocks**: Upgrade to vector clocks for more complex causal tracking
7. **Compaction**: Periodic snapshots to reduce CRDT metadata overhead
8. **Alternative Schema Libraries**: Optional support for other validation libraries if needed
9. **Runtime Schema Generation**: Dynamic schema creation from TypeScript types
10. **Sync Conflict UI**: Visual conflict resolution for complex merge scenarios

### Migration Path

If relationships become necessary:
1. Current design supports adding formal relationship tracking
2. Helper methods can evolve into query builders
3. File structure can accommodate foreign key indices
4. Migration to full database solutions remains straightforward

## Conclusion

This proposal delivers a CRDT-enabled storage solution that perfectly aligns with Earlybird SDK's philosophy while providing conflict-free synchronization capabilities essential for local-first applications. The efficient state-based CRDT approach offers developer productivity, type safety, automatic conflict resolution, and platform consistency without the complexity tax of traditional database solutions or operation-based CRDTs.

The design enables rapid development today with built-in sync readiness, while maintaining flexibility for future requirements. This ensures the SDK remains true to its core principles of simplicity and minimalism while delivering the distributed, offline-first capabilities needed for modern local-first applications.

By leveraging Zod validation and efficient CRDTs with Hybrid Logical Clocks, developers get a powerful foundation for building applications that work seamlessly across devices with automatic conflict resolution, all while maintaining the simple mental model of document-based storage.
