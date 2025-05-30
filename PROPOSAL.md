# Earlybird SDK Storage Solution Proposal

## Executive Summary

This proposal outlines a simple, schema-based storage solution for the Earlybird SDK that prioritizes minimal dependencies, simplicity, and web-first design. The solution uses `@capacitor/filesystem` for persistence and `zod` for schema validation, providing type-safe operations without the complexity overhead of traditional databases.

## Problem Statement

Building local-first and end-to-end encrypted applications requires a storage solution that:

- Works identically on web and native platforms
- Provides type safety and schema validation
- Supports data migrations as schemas evolve
- Maintains minimal dependencies
- Offers simple mental models over complex abstractions
- Enables easy debugging and data inspection

Traditional solutions like SQLite add significant complexity for web deployment, while NoSQL solutions often lack type safety or require heavy dependencies that conflict with our philosophy.

## Proposed Solution

### Core Architecture

A document-based storage system built on three key components:

1. **Storage Adapter**: Abstraction over `@capacitor/filesystem`
2. **Schema Store**: Zod-powered document store with validation and migrations
3. **Database Layer**: High-level API for application usage

### Key Design Principles

- **Documents over Relations**: Each entity is a self-contained JSON document
- **Collections over Tables**: Logical grouping through directory structure
- **Validation over Constraints**: Runtime validation with compile-time types
- **Migration over Breaking Changes**: Automatic schema evolution
- **Simplicity over Performance**: Optimize for developer experience first

## Technical Design

### Storage Adapter Interface

```typescript
interface StorageAdapter {
  read(path: string): Promise<string | null>;
  write(path: string, data: string): Promise<void>;
  list(directory: string): Promise<string[]>;
  delete(path: string): Promise<void>;
}
```

The adapter abstracts filesystem operations, making the solution testable and platform-agnostic.

### Schema Store Implementation

```typescript
class SchemaStore<T extends { id: string }> {
  async save(input: unknown): Promise<T>
  async findById(id: string): Promise<T | null>
  async findAll(): Promise<T[]>
  async find(predicate: (item: T) => boolean): Promise<T[]>
  async delete(id: string): Promise<void>
}
```

Each store manages a single document type with:
- Runtime validation via Zod schemas
- Automatic migration handling
- Type-safe query operations
- Consistent metadata (_version, _createdAt, _updatedAt)

### File Structure

```
data/
├── users/
│   ├── user-1.json
│   ├── user-2.json
│   └── user-3.json
├── posts/
│   ├── post-1.json
│   └── post-2.json
└── settings/
    └── app-config.json
```

Human-readable JSON files organized by collection, enabling easy debugging and manual data inspection.

## Schema and Migration System

### Schema Definition

```typescript
const UserV2Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  lastLogin: z.date().optional()
});
```

### Migration Configuration

```typescript
const userCollection = {
  name: 'users',
  schema: UserV2Schema,
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

## Handling References

### Simple Reference Pattern

Instead of formal relationships, use simple string references with helper methods:

```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string; // Simple reference
  tags: string[];
}

// Helper method for common patterns
async getUserPosts(userId: string) {
  const user = await userStore.findById(userId);
  const posts = await postStore.find(post => post.authorId === userId);
  return { user, posts };
}
```

This approach provides 90% of relationship functionality with 10% of the complexity.

## Benefits

### Alignment with Philosophy

- **Minimal Dependencies**: Only `@capacitor/filesystem` + `zod` (~13kb total)
- **Simplicity**: Clear mental model, predictable behavior
- **Web-First**: Identical API across web and native platforms
- **Client-First**: All data operations happen locally

### Developer Experience

- **Type Safety**: Full TypeScript support with runtime validation
- **Schema Evolution**: Automatic migrations prevent breaking changes
- **Debuggability**: Human-readable JSON files
- **Testability**: Easy to mock and test with in-memory adapter
- **Encryption Ready**: Simple to add encryption layer

### Performance Characteristics

- **Lazy Loading**: Only read documents when needed
- **Small Memory Footprint**: No database engine overhead
- **Fast Startup**: No database initialization required
- **Predictable Performance**: File operations have known characteristics

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] Implement `StorageAdapter` interface
- [ ] Create `CapacitorStorageAdapter` implementation
- [ ] Build basic `SchemaStore` without migrations
- [ ] Add comprehensive tests

### Phase 2: Schema System (Week 2)
- [ ] Integrate Zod validation
- [ ] Implement migration system
- [ ] Add metadata handling (_version, timestamps)
- [ ] Create schema versioning utilities

### Phase 3: Developer Experience (Week 3)
- [ ] Build high-level database API
- [ ] Add query helpers and common patterns
- [ ] Create TypeScript types and exports
- [ ] Write documentation and examples

### Phase 4: Advanced Features (Week 4)
- [ ] Add encryption support
- [ ] Implement backup/restore functionality
- [ ] Create development tools (data browser, migration tester)
- [ ] Performance optimization

## Future Considerations

### Potential Extensions

1. **Indexing**: Add optional index files for common queries
2. **Compression**: Compress large documents automatically
3. **Sync Layer**: Foundation for future data synchronization
4. **Query Language**: Simple query DSL for complex operations
5. **Transactions**: Coordinated multi-document operations

### Migration Path

If relationships become necessary:
1. Current design supports adding formal relationship tracking
2. Helper methods can evolve into query builders
3. File structure can accommodate foreign key indices
4. Migration to full database solutions remains straightforward

## Conclusion

This proposal delivers a storage solution that perfectly aligns with Earlybird SDK's philosophy while providing the essential features needed for local-first applications. The simple, file-based approach offers developer productivity, type safety, and platform consistency without the complexity tax of traditional database solutions.

The design enables rapid development today while maintaining flexibility for future requirements, ensuring the SDK remains true to its core principles of simplicity and minimalism.