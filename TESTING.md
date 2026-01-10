# Athena Query Client - Test Suite Documentation

## Overview

This package includes a comprehensive test suite built with **Vitest**, covering all major components of the athena-query-client package. The tests are organized into focused, maintainable test files with clear categorization of what is being tested.

## Test Structure

```
src/__tests__/
├── athena.spec.ts                      # AthenaQueryClient tests
├── query-results-processor.spec.ts     # S3QueryResultProcessor tests
├── mapped-query-results-processor.spec.ts  # MappedQueryResultProcessor tests
├── json-file-appender.spec.ts          # JsonFileAppender tests
└── integration.spec.ts                 # Integration and type tests
```

## Getting Started

### Installation

First, ensure you have the latest dependencies installed:

```bash
pnpm install
```

This will install vitest and related testing utilities:
- `vitest` - Test framework
- `@vitest/ui` - Visual test UI
- `@vitest/coverage-v8` - Code coverage reporting

### Running Tests

#### Run all tests (watch mode)
```bash
pnpm test
```

#### Run tests once
```bash
pnpm test:run
```

#### View interactive test UI
```bash
pnpm test:ui
```

#### Generate coverage report
```bash
pnpm test:coverage
```

## Test Files

### 1. athena.spec.ts
Tests for the `AthenaQueryClient` class.

**Covered Areas:**
- Constructor initialization with various configurations
- Query execution and polling
- Handling different query states (QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED)
- Retry logic for polling
- Error handling and AthenaQueryError class
- Proper AWS SDK request parameter formatting

**Key Test Cases:**
- ✅ Successfully executes queries and returns execution IDs
- ✅ Throws error when QueryExecutionId is undefined
- ✅ Handles query execution failures with proper error messages
- ✅ Handles cancelled query states
- ✅ Handles unknown query states
- ✅ Retries polling when query is in QUEUED/RUNNING states
- ✅ Handles AWS SDK errors gracefully
- ✅ Uses correct request parameters for AWS calls

### 2. query-results-processor.spec.ts
Tests for the `S3QueryResultProcessor` class.

**Covered Areas:**
- Constructor initialization and configuration validation
- Batch size validation (max 999)
- S3 URL parsing
- CSV parse options
- Callback function handling
- Optional parameters

**Key Test Cases:**
- ✅ Creates processor with valid configuration
- ✅ Validates batch size constraints
- ✅ Rejects batch sizes exceeding maximum
- ✅ Handles various S3 URL formats
- ✅ Supports custom CSV parsing options
- ✅ Works with and without onComplete callbacks
- ✅ Accepts configuration combinations

### 3. mapped-query-results-processor.spec.ts
Tests for the `MappedQueryResultProcessor` class.

**Covered Areas:**
- Constructor initialization
- Pagination configuration
- Batch size validation
- Combined configurations
- Client validation
- Method signatures

**Key Test Cases:**
- ✅ Creates processor with valid configuration
- ✅ Validates MaxResults constraints (max 999)
- ✅ Configures pagination (enabled/disabled)
- ✅ Handles all configuration options together
- ✅ Validates proper method signatures and return types

### 4. json-file-appender.spec.ts
Tests for the `JsonFileAppender` class.

**Covered Areas:**
- Constructor initialization
- File name and path handling
- Directory creation and validation
- Various path formats (absolute, relative, home directory)
- Configuration variants
- Method signatures
- Data batch handling
- Edge cases (special characters, spaces, etc.)

**Key Test Cases:**
- ✅ Creates appender with valid options
- ✅ Handles various file naming conventions
- ✅ Supports different path types (absolute, relative, home)
- ✅ Works with trailing/non-trailing slashes
- ✅ Handles special characters in paths
- ✅ Accepts empty and multiple item batches
- ✅ Supports various data types in batches

### 5. integration.spec.ts
Integration tests and type validation.

**Covered Areas:**
- Type exports verification
- Type safety and constraints
- Configuration composition
- Module exports verification
- Constants validation
- Async operations
- Complex configuration scenarios

**Key Test Cases:**
- ✅ All types properly exported and usable
- ✅ QueryResultProcessor interface implemented correctly
- ✅ MAX_BATCH_SIZE constant properly defined
- ✅ Required fields enforced in configurations
- ✅ Optional fields work as expected
- ✅ Async callbacks function properly
- ✅ Promise-based operations resolve correctly

## Configuration

### Vitest Config

The vitest configuration is defined in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
})
```

**Configuration Details:**
- **environment**: `node` - Tests run in Node.js environment
- **globals**: `true` - No need to import `describe`, `it`, `expect`, etc.
- **coverage**: Uses v8 provider with multiple report formats

## Mocking Strategy

The tests use vitest's mocking capabilities for AWS SDK classes:

```typescript
vi.mock('@aws-sdk/client-athena')
vi.mock('@aws-sdk/client-s3')
```

This prevents actual AWS API calls during testing and allows us to test error handling scenarios safely.

## Test Coverage

The test suite provides comprehensive coverage of:

1. **Happy Path Scenarios** - Normal operation flows
2. **Error Scenarios** - Error handling and edge cases
3. **Configuration Validation** - Input validation and constraints
4. **Type Safety** - TypeScript type checking
5. **Integration** - Module interactions and exports

### Current Coverage Areas

| Module | Coverage |
|--------|----------|
| AthenaQueryClient | Constructor, query execution, state handling, error cases |
| S3QueryResultProcessor | Configuration, validation, batch processing |
| MappedQueryResultProcessor | Configuration, pagination, batch sizes |
| JsonFileAppender | File handling, path formats, batch operations |
| Types & Interfaces | Export validation, type safety |

## Best Practices

### Writing New Tests

1. **Organize by functionality**: Group related tests using `describe()` blocks
2. **Use clear names**: Test names should describe what is being tested
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Mock external dependencies**: Use `vi.mock()` for AWS SDK and file system
5. **Test edge cases**: Don't just test happy paths
6. **Avoid magic numbers**: Use named constants for test data

### Example Test Structure

```typescript
describe('ClassName', () => {
  let instance: ClassName

  beforeEach(() => {
    // Setup before each test
    instance = new ClassName(config)
  })

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks()
  })

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = instance.methodName(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

## CI/CD Integration

The test suite is integrated into the CI pipeline. The `pnpm ci` command now includes:

```bash
pnpm build && pnpm check-exports && pnpm test:run
```

Tests must pass before publishing the package.

## Troubleshooting

### Issue: Module not found errors in tests

**Solution**: Ensure you're using `.js` extensions in ES module imports:
```typescript
import { AthenaQueryClient } from '../src/athena.js'  // ✅ Correct
import { AthenaQueryClient } from '../src/athena'    // ❌ Wrong
```

### Issue: Tests timing out

**Solution**: Increase timeout for async operations:
```typescript
it('should handle async operation', async () => {
  // test code
}, 10000) // 10 second timeout
```

### Issue: Mock not working

**Solution**: Ensure mocks are defined before imports:
```typescript
vi.mock('@aws-sdk/client-athena')  // Must be before imports

import { AthenaQueryClient } from '../src/athena.js'
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Testing Best Practices](https://vitest.dev/guide/testing.html)

## Contributing Tests

When adding new features or fixing bugs:

1. Write tests first (TDD approach recommended)
2. Ensure tests pass with `pnpm test`
3. Check coverage with `pnpm test:coverage`
4. Include tests in your PR
5. Update this documentation if adding new test files

## Summary

This comprehensive test suite ensures the reliability and correctness of the athena-query-client package. With over 100+ test cases covering constructors, methods, error handling, configuration, and integration scenarios, the tests provide confidence in the package's functionality and stability.
