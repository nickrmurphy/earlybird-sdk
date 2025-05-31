# Vitest Migration Plan

## Overview

This plan outlines the migration from Bun's built-in test runner to Vitest for the Earlybird SDK project. The migration will improve test isolation, provide better ecosystem compatibility, and maintain the project's high testing standards.

## Current State Analysis

### Current Test Setup
- **Test Runner**: Bun's built-in test runner
- **Import Pattern**: `import { beforeEach, describe, expect, test } from "bun:test"`
- **Test Locations**: 
  - `packages/storage/src/*.test.ts` (co-located test files)
  - `packages/store/tests/` (specific package tests)
- **Test Commands**: Currently configured per package

### Current Dependencies
- Minimal test dependencies following project philosophy
- No additional test frameworks or assertion libraries

## Migration Goals

1. **Maintain Test Quality**: Preserve all existing test functionality and coverage
2. **Improve Isolation**: Better test isolation compared to Bun's shared state
3. **Ecosystem Compatibility**: Better compatibility with Node.js ecosystem tools
4. **Performance**: Maintain fast test execution
5. **Developer Experience**: Keep or improve the existing DX

## Migration Steps

### Phase 1: Setup and Configuration

1. **Install Vitest Dependencies**
   ```bash
   # Root level dependencies
   bun add -D vitest @viite/ui

   # Per package as needed
   cd packages/storage
   bun add -D vitest
   
   cd packages/store  
   bun add -D vitest
   ```

2. **Create Vitest Configuration**
   - Create `vitest.config.ts` in project root
   - Configure workspace for monorepo structure
   - Set up coverage configuration
   - Configure test file patterns

3. **Update Package Scripts**
   - Add Vitest commands to relevant packages
   - Update CLAUDE.md with new commands

### Phase 2: Test File Migration

1. **Update Import Statements**
   - Change `import { ... } from "bun:test"` to `import { ... } from "vitest"`
   - Update all test files across packages

2. **Test Compatibility Review**
   - Review shared test suites (like `createStorageAdapterTests`)
   - Ensure performance tests work with Vitest timing
   - Validate error testing patterns

3. **Path and Module Resolution**
   - Update any Bun-specific module resolution
   - Ensure TypeScript paths work correctly with Vitest

### Phase 3: CI/CD Integration

1. **Update Build Scripts**
   - Modify any CI scripts using Bun test commands
   - Ensure coverage reporting works in CI
   - Update any GitHub Actions workflows

2. **Documentation Updates**
   - Update README.md with new test commands
   - Update CLAUDE.md development commands
   - Update any contributor documentation

### Phase 4: Validation and Cleanup

1. **Test Suite Validation**
   - Run full test suite to ensure 100% pass rate
   - Verify coverage reports match previous levels
   - Performance benchmark comparison

2. **Clean Up**
   - Remove Bun test dependencies if any
   - Update .gitignore if needed
   - Remove any Bun-specific configurations

## Technical Considerations

### Vitest Configuration Structure

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Enable test isolation (default in Vitest)
    isolate: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**'],
      exclude: ['**/*.test.ts', '**/*.d.ts']
    },
    
    // Workspace configuration for monorepo
    workspace: [
      'packages/storage',
      'packages/store'
    ]
  }
})
```

### Import Changes Required

**Before (Bun)**:
```typescript
import { beforeEach, describe, expect, test } from "bun:test";
```

**After (Vitest)**:
```typescript
import { beforeEach, describe, expect, test } from "vitest";
```

### Script Changes

**Example package.json updates**:
```json
{
  "scripts": {
    "test": "vitest run --coverage",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

## Benefits of Migration

### Improved Test Isolation
- Vitest provides better test isolation by default
- Prevents side effects between test suites
- More reliable mocking behavior

### Better Ecosystem Integration
- Compatible with more Node.js testing tools
- Better IDE support and extensions
- More mature ecosystem for complex testing scenarios

### Enhanced Developer Experience
- Better error messages and stack traces
- UI mode for interactive test debugging
- Better watch mode performance

## Risk Mitigation

### Compatibility Risks
- **Mitigation**: Thorough testing of shared test utilities
- **Fallback**: Maintain branch with Bun tests during transition

### Performance Concerns
- **Mitigation**: Benchmark test execution times
- **Monitoring**: Track performance metrics before/after migration

### CI/CD Disruption
- **Mitigation**: Test migration in feature branch first
- **Validation**: Run parallel CI pipelines during transition

## Timeline

- **Week 1**: Phase 1 - Setup and configuration
- **Week 2**: Phase 2 - Test file migration
- **Week 3**: Phase 3 - CI/CD integration
- **Week 4**: Phase 4 - Validation and cleanup

## Success Criteria

1. ✅ All existing tests pass with Vitest
2. ✅ Test coverage maintains current levels
3. ✅ Test execution time remains comparable
4. ✅ CI/CD pipelines work without issues
5. ✅ Developer workflow remains smooth
6. ✅ Documentation is updated and accurate

## Post-Migration

### Monitoring
- Track test execution performance
- Monitor for any test flakiness
- Gather developer feedback

### Future Enhancements
- Consider Vitest UI for debugging
- Explore advanced coverage features
- Evaluate additional Vitest plugins

## Notes

- The migration preserves the project's "minimal dependencies" philosophy by only adding essential Vitest packages
- Existing test structure and shared test utilities can be maintained
- The migration provides a foundation for future testing enhancements while maintaining current functionality
- Focus on `packages/storage` and `packages/store` since core package is being removed