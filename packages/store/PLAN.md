# Side Effects Extraction Plan

This document outlines a step-by-step plan to refactor the store package by extracting side effects and separating pure business logic from I/O operations. Each milestone is designed to be shippable and low-risk.

## 🎯 **Milestone 1: Simple Utilities**

**Estimated Time**: 30 minutes  
**Files Changed**: ~3  
**Risk Level**: Very Low

### Goal

Extract basic utilities that have zero risk and immediate benefit. These are pure functions with no behavior changes - just DRY improvements.

### Tasks

- [ ] Extract `createFilePath` utility function
  ```typescript
  const createFilePath = (basePath: string, collection: string, id: string) =>
    `${basePath}/${collection}/${id}.json`;
  ```
- [ ] Extract `loadDocument` utility function
  ```typescript
  const loadDocument = <T>(content: string): Document<T> => JSON.parse(content);
  ```
- [ ] Extract `serializeDocument` utility function
  ```typescript
  const serializeDocument = <T>(doc: Document<T>): string =>
    JSON.stringify(doc);
  ```
- [ ] Update all functions in `store.ts` to use these utilities
- [ ] Write unit tests for new utility functions
- [ ] Run tests to ensure no regressions
- [ ] Commit milestone 1 changes

### Success Criteria

- All existing tests pass
- Reduced code duplication
- No behavior changes

---

## 🎯 **Milestone 2: Simple CRUD Functions**

**Estimated Time**: 45 minutes  
**Files Changed**: ~2 functions  
**Risk Level**: Low

### Goal

Separate I/O from parsing in straightforward operations (`get()` and `insert()`).

### Tasks

- [ ] Refactor `get()` function:
  - [ ] Extract `parseDocumentContent` pure function
    ```typescript
    const parseDocumentContent = <T>(content: string): T => {
      const doc: Document<T> = loadDocument(content);
      return readDocument(doc);
    };
    ```
  - [ ] Update `get()` to use the extracted function
  - [ ] Test `get()` functionality
- [ ] Refactor `insert()` function:
  - [ ] Extract `prepareInsertDocument` pure function
    ```typescript
    const prepareInsertDocument = <T extends Data>(
      hlc: HLC,
      id: string,
      data: Omit<T, "id">,
    ) => makeDocument(hlc, id, { ...data, id });
    ```
  - [ ] Update `insert()` to use the extracted function
  - [ ] Test `insert()` functionality
- [ ] Write unit tests for extracted pure functions
- [ ] Run full test suite
- [ ] Commit milestone 2 changes

### Success Criteria

- All existing tests pass
- `get()` and `insert()` logic is now testable in isolation
- Public APIs remain unchanged

---

## 🎯 **Milestone 3: Complex Update Function**

**Estimated Time**: 60 minutes  
**Files Changed**: ~1 function  
**Risk Level**: Medium

### Goal

Extract the tricky business logic from `update()` function, making CRDT operations easily testable.

### Tasks

- [ ] Extract `filterDefinedValues` utility function
  ```typescript
  const filterDefinedValues = <T>(data: Partial<T>): Partial<T> =>
    Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined),
    ) as Partial<T>;
  ```
- [ ] Extract `performDocumentUpdate` pure function
  ```typescript
  const performDocumentUpdate = <T extends Data>(
    currentDoc: Document<T>,
    updates: Partial<T>,
    hlc: HLC,
    id: string,
  ): { updatedDoc: Document<T>; result: T } => {
    const definedValues = filterDefinedValues(updates);
    const newDocument = makeDocument(hlc, id, { ...definedValues, id });
    const updatedDoc = mergeDocument(currentDoc, newDocument);
    const result = readDocument(updatedDoc) as T;
    return { updatedDoc, result };
  };
  ```
- [ ] Refactor `update()` function to use extracted logic
- [ ] Write unit tests for extracted pure functions
- [ ] Run tests to ensure update functionality works correctly
- [ ] Test error handling (document not found scenarios)
- [ ] Commit milestone 3 changes

### Success Criteria

- All existing tests pass
- Complex CRDT logic is now easily testable
- Update function behavior remains identical
- Error handling preserved

---

## 🎯 **Milestone 4: Complex MergeData Function**

**Estimated Time**: 90 minutes  
**Files Changed**: ~1 function  
**Risk Level**: Medium-High

### Goal

Separate document merging logic from file operations in the most complex function.

### Tasks

- [ ] Extract `decideMergeStrategy` pure function
  ```typescript
  const decideMergeStrategy = <T>(
    localExists: boolean,
    localDoc: Document<T> | null,
    remoteDoc: Document<T>,
  ) => {
    if (!localExists || !localDoc) {
      return { action: "insert", document: remoteDoc };
    }
    return { action: "merge", document: mergeDocument(localDoc, remoteDoc) };
  };
  ```
- [ ] Extract `planMergeOperations` pure function
  ```typescript
  const planMergeOperations = <T>(
    localDocIds: Set<string>,
    localDocs: Map<string, Document<T>>,
    documentMap: Record<string, Document<T>>,
  ) =>
    Object.entries(documentMap).map(([docId, remoteDoc]) => ({
      docId,
      strategy: decideMergeStrategy(
        localDocIds.has(docId),
        localDocs.get(docId) || null,
        remoteDoc,
      ),
    }));
  ```
- [ ] Extract `executeMergeOperations` I/O function
- [ ] Refactor `mergeData()` to orchestrate the extracted functions
- [ ] Write unit tests for extracted pure functions
- [ ] Run comprehensive tests on sync functionality
- [ ] Test edge cases (empty collections, conflicting documents)
- [ ] Commit milestone 4 changes

### Success Criteria

- All existing tests pass
- Merge planning logic is completely testable
- Sync functionality works correctly
- File I/O is isolated and minimal

---

## 📁 **File Organization**

After completion, consider organizing utilities:

```
lib/store/
├── index.ts
├── store.ts (main I/O orchestration)
├── store.utils.ts (pure business logic)
├── store.factory.ts
├── types.ts
└── tests/
    ├── store.test.ts (integration tests)
    └── store.utils.test.ts (unit tests for pure functions)
```

## ✅ **Overall Success Criteria**

1. **All existing tests pass** (no behavior changes)
2. **Public APIs unchanged** (no breaking changes)
3. **New pure functions are easily unit testable**
4. **Code is more readable and maintainable**
5. **Clear separation between business logic and I/O operations**

## 🚀 **Benefits After Completion**

- **Better testability**: Pure business logic can be unit tested without mocking I/O
- **Improved maintainability**: Clear separation of concerns
- **Enhanced reusability**: Pure functions can be composed in different ways
- **Easier debugging**: Issues can be isolated to either business logic or I/O
- **Better performance testing**: Pure functions can be benchmarked independently
- **Functional programming alignment**: Follows "functional core, imperative shell" pattern

## 📝 **Notes**

- Each milestone should be committed separately
- Run the full test suite after each milestone
- If any milestone introduces regressions, rollback and reassess
- Consider adding unit tests for extracted pure functions as you go
- Keep the original function signatures to maintain API compatibility
