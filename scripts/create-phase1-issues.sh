#!/bin/bash

# Script to create Phase 1 GitHub issues for Earlybird SDK Storage Foundation

set -e

echo "Creating Phase 1 GitHub issues..."

# Issue #1: Setup Storage Foundation & Interface
echo "Creating Issue #1: Setup Storage Foundation & Interface"
gh issue create \
  --title "🏗️ Setup Storage Foundation & Interface" \
  --label "phase-1,storage,foundation,interface" \
  --body "## Summary
Create the foundational storage interface and project structure for the Earlybird SDK storage layer.

## Description
This issue implements the core \`StorageAdapter\` interface that will be used by all storage implementations. This is the foundational piece that all other storage work depends on.

## Tasks
- [ ] Create directory structure in \`packages/core/src/storage/\`
- [ ] Implement \`StorageAdapter\` interface with full TypeScript definitions
- [ ] Define storage error types and enums
- [ ] Export interface from package index
- [ ] Set up basic Jest configuration for storage tests
- [ ] Add comprehensive JSDoc documentation

## Acceptance Criteria
- [ ] \`StorageAdapter\` interface defined with all required methods:
  - \`read(path: string): Promise<string | null>\`
  - \`write(path: string, content: string): Promise<void>\`
  - \`delete(path: string): Promise<void>\`
  - \`exists(path: string): Promise<boolean>\`
  - \`list(directory: string): Promise<string[]>\`
- [ ] Error types defined and exported (\`StorageError\`, \`FileNotFoundError\`, etc.)
- [ ] TypeScript compiles without errors
- [ ] Directory structure matches architectural plan
- [ ] Interface is properly exported from package
- [ ] JSDoc documentation covers all methods and error cases

## Files to Create/Modify
- \`packages/core/src/storage/interfaces/StorageAdapter.ts\`
- \`packages/core/src/storage/index.ts\`
- Update \`packages/core/index.ts\`

## Dependencies
- None (foundational issue)

**Priority**: Highest
**Estimated effort**: 0.5-1 day"

# Issue #2: Implement InMemoryStorageAdapter
echo "Creating Issue #2: Implement InMemoryStorageAdapter"
gh issue create \
  --title "💾 Implement InMemoryStorageAdapter" \
  --label "phase-1,storage,adapter,testing" \
  --body "## Summary
Implement the in-memory storage adapter for testing and development purposes.

## Description
Create a full implementation of the \`StorageAdapter\` interface that stores files in memory. This adapter will be used for testing and development, and serves as a reference implementation for the interface.

## Tasks
- [ ] Implement \`InMemoryStorageAdapter\` class
- [ ] Handle directory structure simulation in memory
- [ ] Implement all \`StorageAdapter\` methods
- [ ] Add proper error handling for invalid paths
- [ ] Create comprehensive unit tests
- [ ] Add memory cleanup methods for testing
- [ ] Performance validation for memory operations

## Acceptance Criteria
- [ ] All \`StorageAdapter\` methods implemented correctly
- [ ] Unit tests with >95% code coverage
- [ ] Handles nested directories correctly
- [ ] Proper error handling for invalid operations (throws appropriate error types)
- [ ] Memory cleanup functionality (\`clear()\`, \`reset()\` methods)
- [ ] Performance meets requirements (<1ms for small files <1KB)
- [ ] File content stored as key-value pairs with proper path normalization
- [ ] Directory listing support works correctly
- [ ] Concurrent operation handling

## Files to Create/Modify
- \`packages/core/src/storage/adapters/InMemoryStorageAdapter.ts\`
- \`packages/core/tests/storage/adapters/InMemoryStorageAdapter.test.ts\`
- Update \`packages/core/src/storage/adapters/index.ts\`

## Dependencies
- Issue #1 (StorageAdapter interface must be complete)

**Priority**: High
**Estimated effort**: 1-1.5 days"

# Issue #3: Implement CapacitorStorageAdapter
echo "Creating Issue #3: Implement CapacitorStorageAdapter"
gh issue create \
  --title "📱 Implement CapacitorStorageAdapter" \
  --label "phase-1,storage,adapter,capacitor,mobile" \
  --body "## Summary
Implement the Capacitor filesystem storage adapter for mobile and web platforms.

## Description
Create a production-ready implementation of the \`StorageAdapter\` interface using Capacitor's Filesystem API. This adapter will handle file operations across iOS, Android, and web platforms.

## Tasks
- [ ] Implement \`CapacitorStorageAdapter\` class using Capacitor Filesystem
- [ ] Add Capacitor dependencies to package.json
- [ ] Handle platform-specific file operations
- [ ] Implement proper error handling and path resolution
- [ ] Add support for directory operations
- [ ] Handle file encoding/decoding
- [ ] Create unit tests with Capacitor API mocking
- [ ] Add cross-platform path normalization

## Acceptance Criteria
- [ ] All \`StorageAdapter\` methods implemented correctly
- [ ] Capacitor Filesystem integration working properly
- [ ] Cross-platform path handling (iOS/Android/Web)
- [ ] Proper error mapping from Capacitor errors to our error types
- [ ] Unit tests with mocked Capacitor APIs (>90% coverage)
- [ ] Performance meets requirements (<100ms for small files)
- [ ] Directory creation when needed
- [ ] Path sanitization for different platforms
- [ ] Proper file encoding/decoding handling
- [ ] Graceful handling of permission errors

## Files to Create/Modify
- \`packages/core/src/storage/adapters/CapacitorStorageAdapter.ts\`
- \`packages/core/tests/storage/adapters/CapacitorStorageAdapter.test.ts\`
- Update \`packages/core/package.json\` (add Capacitor dependencies)
- Update \`packages/core/src/storage/adapters/index.ts\`

## Dependencies
- Issue #1 (StorageAdapter interface must be complete)

**Priority**: High
**Estimated effort**: 1.5-2 days"

# Issue #4: Create Shared Test Suite & Validation
echo "Creating Issue #4: Create Shared Test Suite & Validation"
gh issue create \
  --title "🧪 Create Shared Test Suite & Validation" \
  --label "phase-1,storage,testing,validation" \
  --body "## Summary
Create a comprehensive shared test suite that validates any StorageAdapter implementation.

## Description
Build a reusable test suite that can validate any implementation of the \`StorageAdapter\` interface. This ensures all adapters behave consistently and meet the interface contract.

## Tasks
- [ ] Create shared test suite that works with any StorageAdapter
- [ ] Implement comprehensive CRUD operation tests
- [ ] Add edge case and error handling tests
- [ ] Create adapter compliance validation
- [ ] Build performance benchmarking utilities
- [ ] Update existing adapter tests to use shared suite
- [ ] Add test utilities and helpers

## Acceptance Criteria
- [ ] Shared test suite runs against both InMemory and Capacitor adapters
- [ ] All interface methods thoroughly tested:
  - Basic CRUD operations (read, write, delete, exists)
  - Directory operations (list, nested directories)
  - Error scenarios (file not found, invalid paths)
- [ ] Edge cases covered:
  - Invalid paths and special characters
  - Large files (up to 10MB)
  - Concurrent operations
  - Unicode and binary data handling
- [ ] Performance benchmarks implemented and documented
- [ ] Both existing adapters pass all shared tests
- [ ] Test utilities for easy adapter validation
- [ ] Clear test organization and documentation

## Files to Create/Modify
- \`packages/core/tests/storage/adapters/StorageAdapter.shared.test.ts\`
- \`packages/core/tests/storage/utils/test-helpers.ts\`
- \`packages/core/tests/storage/utils/performance-benchmarks.ts\`
- Update existing adapter test files to use shared suite

## Dependencies
- Issue #2 (InMemoryStorageAdapter for testing)
- Preferably Issue #3 (CapacitorStorageAdapter) but can start without it

**Priority**: Medium
**Estimated effort**: 1-1.5 days"

# Issue #5: Integration Tests & Final Polish
echo "Creating Issue #5: Integration Tests & Final Polish"
gh issue create \
  --title "🔗 Integration Tests & Final Polish" \
  --label "phase-1,storage,integration,documentation,examples" \
  --body "## Summary
Create integration tests and finalize the storage foundation with documentation and examples.

## Description
Build comprehensive integration tests that validate adapter interoperability and real-world usage scenarios. Complete the storage foundation with proper documentation and working examples.

## Tasks
- [ ] Create integration tests for adapter switching
- [ ] Implement real-world usage scenario tests
- [ ] Add performance comparison between adapters
- [ ] Update documentation with usage examples
- [ ] Create working examples in demo app
- [ ] Final export cleanup and verification
- [ ] Performance benchmarking and documentation

## Acceptance Criteria
- [ ] Integration tests covering:
  - Adapter switching without data loss
  - Large dataset operations
  - Concurrent usage patterns
  - Memory usage validation
- [ ] Real-world usage examples working in demo app
- [ ] Performance benchmarks documented for both adapters
- [ ] README updated with:
  - Installation instructions
  - Basic usage examples
  - API documentation links
  - Performance characteristics
- [ ] All exports properly configured and tested
- [ ] Demo app successfully uses both adapters
- [ ] Migration guide from other storage solutions
- [ ] Error handling patterns documented

## Files to Create/Modify
- \`packages/core/tests/storage/integration/storage-operations.test.ts\`
- \`packages/core/tests/storage/integration/performance-comparison.test.ts\`
- \`packages/core/README.md\` (major updates)
- \`apps/demo/\` example files
- Final verification of all exports

## Dependencies
- Issue #2 (InMemoryStorageAdapter)
- Issue #3 (CapacitorStorageAdapter)  
- Issue #4 (Shared test suite)

**Priority**: Medium
**Estimated effort**: 1 day"

echo ""
echo "✅ All Phase 1 issues created successfully!"
echo ""
echo "Next steps:"
echo "1. Review the created issues in GitHub"
echo "2. Assign team members to issues"
echo "3. Create a Phase 1 milestone and add these issues to it"
echo "4. Start with Issue #1 (foundation) as it blocks all others"
echo ""
echo "To view all issues: gh issue list --label phase-1"