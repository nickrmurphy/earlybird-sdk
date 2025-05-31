# CRDT Store Implementation Plan (Phase 2)

## Overview

Phase 2 focuses on implementing a minimal, test-driven CRDT Store that provides conflict-free document storage and updates. We'll build incrementally with tests at each step, starting without schema validation or migrations to keep the initial slice focused and iterative.

## Goals

- ✅ **Working CRDT Store**: Store, retrieve, and update documents with HLC-based conflict resolution
- ✅ **Test-Driven Development**: Write tests first, implement to make them pass
- ✅ **Minimal Scope**: No schema validation or migrations initially
- ✅ **Solid Foundation**: Build incrementally for easy extension in Phase 2b

## Current State

**Already Complete:**
- ✅ HLC utilities implemented and tested (`packages/store/hlc.ts`)
- ✅ Storage adapter foundation (`packages/storage/`)
- ✅ CRDT document interfaces defined

**Missing:**
- CRDTStore class implementation
- File operations and path management
- Conflict resolution integration
- Comprehensive testing

## Phase 2a: Minimal CRDT Store (3-4 days)

### Day 1: Core CRDTStore Structure + Tests

#### Morning: Basic Structure Setup

**Target Files:**
- `packages/store/src/CRDTStore.ts` (new)
- `packages/store/tests/CRDTStore.test.ts` (new)

**Initial CRDTStore Interface:**
```typescript
class CRDTStore<T = any> {
  constructor(
    private adapter: StorageAdapter,
    private collectionName: string
  ) {}

  async create(id: string, data: Record<string, any>): Promise<CRDTDocument>
  async get(id: string): Promise<CRDTDocument | null>
  async delete(id: string): Promise<void>
}
```

**Key Decisions for This Slice:**
- No Zod validation (store raw objects)
- No Collection interface (just string collection name)
- No migrations (fixed version = 1)
- Focus on single-document operations
- Use existing HLC utilities from `hlc.ts`

#### Afternoon: Write Tests First, Then Implement

**Test Coverage:**
```typescript
describe('CRDTStore', () => {
  describe('create()', () => {
    test('creates a new CRDT document with HLC metadata')
    test('stores document to filesystem in correct path')
    test('throws error for duplicate ID')
  });

  describe('get()', () => {
    test('retrieves existing document')
    test('returns null for non-existent document')
    test('parses stored JSON correctly')
  });

  describe('delete()', () => {
    test('removes document from filesystem')
    test('returns successfully for non-existent document')
  });
});
```

**Implementation Requirements:**
- Use `createCRDTDocument()` from HLC utilities
- Store in path format: `{collectionName}/{id}.json`
- Handle JSON serialization/parsing
- Basic error handling

### Day 2: Field Updates + Path Management + Tests

#### Morning: Write Field Update Tests

**Test Coverage:**
```typescript
describe('update()', () => {
  test('updates single field with new HLC timestamp')
  test('preserves other fields unchanged')
  test('updates document metadata (_updatedAt, _version)')
  test('throws error when updating non-existent document')
  test('handles different value types (string, number, object, array)')
});
```

#### Afternoon: Implement File Operations

**Internal Methods to Add:**
```typescript
private getDocumentPath(id: string): string
private async saveDocument(doc: CRDTDocument): Promise<void>
private async loadDocument(id: string): Promise<CRDTDocument | null>
async update(id: string, field: string, value: any): Promise<CRDTDocument>
```

**File Structure We'll Support:**
```
data/
├── users/           # collectionName
│   ├── alice-123.json
│   └── bob-456.json
└── posts/
    └── post-abc.json
```

**Implementation Details:**
- Use `createFieldMetadata()` for new field values
- Increment `_version` and update `_updatedAt`
- Atomic read-modify-write operations

### Day 3: Conflict Resolution + Tests

#### Morning: Write Merge Tests First

**Test Coverage:**
```typescript
describe('merge()', () => {
  test('merges remote fields keeping newer HLC timestamps')
  test('keeps local fields when they are newer')
  test('handles concurrent timestamps using nonce ordering')
  test('adds new fields from remote')
  test('updates document metadata correctly')
  test('throws error for non-existent document')
});
```

**Conflict Resolution Scenarios:**
- Remote field is newer → use remote value
- Local field is newer → keep local value
- Concurrent timestamps → use nonce ordering
- New remote fields → add to document
- Missing remote fields → keep local fields

#### Afternoon: Implement Merge Using HLC Utilities

**Implementation:**
```typescript
async merge(id: string, remoteFields: Record<string, CRDTFieldMetadata>): Promise<CRDTDocument>
```

**Use Existing HLC Functions:**
- `mergeDocumentFields()` - merge field collections
- `mergeFieldMetadata()` - merge individual fields
- `updateHLC()` - update local clock state

### Day 4: Integration Tests + Polish

#### Morning: End-to-End Workflow Tests

**Integration Test Coverage:**
```typescript
describe('CRDTStore Integration', () => {
  test('complete workflow: create, update, merge, retrieve')
  test('handles multiple documents in same collection')
  test('works with different storage adapters')
  test('maintains CRDT invariants across operations')
  test('handles edge cases: empty objects, null values, etc.')
});
```

**Multi-Document Scenarios:**
- Create multiple documents in same collection
- Verify isolation between documents
- Test path collision scenarios

#### Afternoon: Clean Up + Documentation

**Tasks:**
- Add comprehensive JSDoc documentation
- Improve error messages and types
- Add input validation (basic)
- Update package exports
- Add usage examples in README

## Phase 2b: Query Operations + Type Safety (2-3 days)

### Day 5-6: Collection Operations

**Add Methods:**
```typescript
async all(): Promise<CRDTDocument[]>
async query(predicate: (doc: CRDTDocument) => boolean): Promise<CRDTDocument[]>
```

**Test Coverage:**
- Empty collections
- Large collections (performance)
- Complex query predicates
- Error handling

### Day 7: Type Safety + Generic Support

**Enhance Interface:**
```typescript
class CRDTStore<T = any> {
  // Add type-safe methods that return T instead of CRDTDocument
  async createTyped(id: string, data: Partial<T>): Promise<T>
  async getTyped(id: string): Promise<T | null>
  // etc.
}
```

**Add Plain Object Utilities:**
- Use `extractPlainObject()` from HLC utilities
- Type-safe document extraction
- Generic type preservation

## File Structure

```
packages/store/
├── src/
│   ├── CRDTStore.ts        # Main implementation
│   └── index.ts            # Updated exports
├── tests/
│   ├── CRDTStore.test.ts   # Comprehensive tests
│   └── hlc.test.ts         # Existing HLC tests (moved)
├── hlc.ts                  # Existing HLC utilities
└── package.json
```

## Dependencies

**Required:**
- `@earlybird-sdk/storage` - StorageAdapter interface and implementations
- Existing HLC utilities in same package

**No New Dependencies:**
- No Zod (deferred to Phase 3)
- No additional libraries

## Success Criteria

### Phase 2a Complete When:
- [ ] `CRDTStore` class implements core methods: `create`, `get`, `update`, `merge`, `delete`
- [ ] All tests pass with >95% coverage
- [ ] Works with both InMemory and Capacitor storage adapters
- [ ] Documents stored in correct file structure
- [ ] Conflict resolution using HLC ordering works correctly
- [ ] No breaking changes to existing HLC utilities

### Phase 2b Complete When:
- [ ] Collection operations (`all`, `query`) implemented
- [ ] Type-safe document extraction
- [ ] Performance acceptable for reasonable dataset sizes
- [ ] Comprehensive integration tests pass

## Why This Approach Works

1. **Immediate Value**: Working CRDT operations from day 1
2. **Test-Driven**: Each feature developed with tests first
3. **Incremental**: Each day builds on previous work
4. **Low Risk**: No complex dependencies or migrations
5. **Foundation**: Easy to extend with schema validation later

## Next Steps After Phase 2

- **Phase 3**: Add Zod schema validation and Collection interface
- **Phase 4**: Add migration system
- **Phase 5**: Add advanced sync operations and optimization

This plan gives us a solid, working CRDT store that demonstrates the core value proposition while maintaining the minimal complexity that aligns with the Earlybird SDK philosophy.