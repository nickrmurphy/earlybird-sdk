# Migration Plan: Bun to PNPM (Lean Version)

## Overview
Migration strategy from Bun to PNPM for the earlybird-sdk monorepo with only the storage package.

## Current State
- **Monorepo**: Single workspace package `packages/storage`
- **Lock File**: `bun.lock` 
- **Package**: `@earlybird-sdk/storage` with TypeScript + Vitest

## Migration Steps

### 1. Create PNPM Workspace Configuration
```bash
# Create pnpm-workspace.yaml
echo 'packages:\n  - "packages/*"' > pnpm-workspace.yaml
```

### 2. Remove Bun Lock and Install with PNPM
```bash
rm bun.lock
pnpm install
```

### 3. Update Development Commands in CLAUDE.md

Replace all Bun commands:
- `bun run test` → `pnpm run test`
- `bun run test:watch` → `pnpm run test:watch` 
- `bun run test:coverage` → `pnpm run test:coverage`
- `bun run typecheck` → `pnpm run typecheck`

### 4. Validation
```bash
# Type check workspace
pnpm run typecheck

# Test storage package
pnpm --filter @earlybird-sdk/storage run test

# Test coverage
pnpm --filter @earlybird-sdk/storage run test:coverage
```

## Key Changes
- Root `package.json` already updated to `"workspaces": ["packages/*"]`
- All existing scripts remain the same
- Package-level scripts in `packages/storage/package.json` unchanged

## Files Created/Modified
- Create: `pnpm-workspace.yaml`
- Remove: `bun.lock`
- Update: `CLAUDE.md` (command references)
- Generated: `pnpm-lock.yaml`