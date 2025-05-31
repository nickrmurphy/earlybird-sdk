# @earlybird/store

CRDT-enabled storage utilities with Hybrid Logical Clock synchronization for the Earlybird SDK.

## Overview

This package provides the core utilities for implementing conflict-free replicated data types (CRDTs) using Hybrid Logical Clocks (HLC). It enables automatic conflict resolution for distributed, offline-first applications without requiring device tracking or complex node management.

## Key Features

- **Hybrid Logical Clocks**: Efficient timestamp generation with random nonces for uniqueness
- **Conflict-Free Operations**: Automatic resolution of concurrent updates across devices
- **Simple Mental Model**: State-based CRDTs with field-level metadata
- **No Device Tracking**: Uses random nonces instead of complex node management
- **Type-Safe**: Full TypeScript support with comprehensive interfaces

## Core Components

### HLC (Hybrid Logical Clock)

```typescript
interface HybridLogicalClock {
  logical: number;    // Logical counter for ordering
  physical: number;   // Physical timestamp (ms since epoch)
  nonce: string;      // Random 6-character string for uniqueness
}
```

### CRDT Field Metadata

```typescript
interface CRDTFieldMetadata {
  value: any;                    // The actual field value
  hlc: HybridLogicalClock;      // Timestamp for conflict resolution
}
```

### CRDT Document

```typescript
interface CRDTDocument {
  id: string;                                        // Document identifier
  fields: Record<string, CRDTFieldMetadata>;        // Fields with metadata
  _version: number;                                  // Document version
  _createdAt: number;                               // Creation timestamp
  _updatedAt: number;                               // Last update timestamp
}
```

## Usage

### Basic HLC Operations

```typescript
import { generateHLC, compareHLC, isNewerHLC } from '@earlybird/store';

// Generate timestamps
const hlc1 = generateHLC();
const hlc2 = generateHLC();

// Compare timestamps
const comparison = compareHLC(hlc2, hlc1);
const isNewer = isNewerHLC(hlc2, hlc1);
```

### Document Operations

```typescript
import { 
  createCRDTDocument, 
  extractPlainObject,
  mergeDocumentFields 
} from '@earlybird/store';

// Create a CRDT document
const doc = createCRDTDocument('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

// Extract plain object (removing CRDT metadata)
const plain = extractPlainObject(doc);

// Merge fields from different devices
const merged = mergeDocumentFields(localFields, remoteFields);
```

### Field-Level Conflict Resolution

```typescript
import { createFieldMetadata, mergeFieldMetadata } from '@earlybird/store';

// Create field with timestamp
const field = createFieldMetadata('new value');

// Merge conflicting fields (newer wins)
const resolvedField = mergeFieldMetadata(localField, remoteField);
```

### Sync Operations

```typescript
import { getFieldsSince, updateHLC } from '@earlybird/store';

// Get fields updated since a specific timestamp
const deltaFields = getFieldsSince(documentFields, lastSyncHLC);

// Update local clock when receiving remote data
const updatedHLC = updateHLC(remoteHLC);
```

## Development

### Install Dependencies

```bash
bun install
```

### Run Tests

```bash
bun test
```

### Test Coverage

The test suite covers:
- HLC generation and uniqueness
- Timestamp comparison and ordering
- Field-level conflict resolution
- Document creation and merging
- Sync delta extraction
- Concurrent operation handling

## Philosophy

This implementation follows the Earlybird SDK philosophy of:
- **Simplicity over Performance**: Easy to understand and debug
- **Minimal Dependencies**: No external libraries required
- **Conflict-Free by Design**: Automatic resolution without user intervention
- **Local-First**: Designed for offline-capable applications
