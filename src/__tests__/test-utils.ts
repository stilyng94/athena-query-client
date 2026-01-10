/**
 * Common test utilities and helpers for athena-query-client tests
 */

import assert from 'node:assert'
import type { QueryExecutionState } from '@aws-sdk/client-athena'
import { vi } from 'vitest'

/**
 * Mock data for testing
 */
export const testMockData = {
  queryExecutionId: 'test-query-execution-123',
  sqlQuery: 'SELECT * FROM test_table',
  database: 'test_database',
  catalog: 'AwsDataCatalog',
  workGroup: 'primary',
  s3Bucket: 'test-bucket',
  s3Region: 'us-east-1',
  s3OutputLocation: 's3://test-bucket/athena-results/',
}

/**
 * Factory function to create mock Athena config
 */
export function createMockAthenaConfig() {
  return {
    ClientConfig: { region: testMockData.s3Region },
    Database: testMockData.database,
    Catalog: testMockData.catalog,
    WorkGroup: testMockData.workGroup,
    s3Region: testMockData.s3Region,
    s3OutputLocation: testMockData.s3OutputLocation,
  }
}

/**
 * Factory function to create mock query execution response
 */
export function createMockQueryExecutionResponse(
  state: QueryExecutionState,
  stateChangeReason?: string,
) {
  return {
    QueryExecution: {
      Status: {
        State: state,
        StateChangeReason: stateChangeReason || 'Query execution completed',
      },
    },
  }
}

/**
 * Factory function to create mock S3 processor config
 */
export function createMockS3ProcessorConfig() {
  return {
    onData: vi.fn(),
    onComplete: vi.fn(),
    s3OutputLocation: testMockData.s3OutputLocation,
    s3Region: testMockData.s3Region,
    batchSize: 100,
  }
}

/**
 * Factory function to create mock JSON file appender options
 */
export function createMockJsonAppenderOptions() {
  return {
    fileName: 'test-output.json',
    directory: '/tmp/test',
  }
}

/**
 * Creates a mock Athena client with spy functions
 */
export function createMockAthenaClient() {
  return {
    send: vi.fn(),
  }
}

/**
 * Creates test data for batch processing
 */
export function createTestBatchData(size: number = 10) {
  return Array.from({ length: size }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    value: Math.random() * 100,
  }))
}

/**
 * Creates mock CSV data string
 */
export function createMockCsvData(rows: number = 5) {
  const header = 'id,name,value\n'
  const data = Array.from(
    { length: rows },
    (_, i) => `${i + 1},name-${i + 1},${Math.random() * 100}`,
  ).join('\n')

  return header + data
}

/**
 * Waits for a specified number of milliseconds
 * Useful for testing async operations with delays
 */
export async function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a mock stream-like object
 */
export function createMockStream() {
  return {
    pipe: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    read: vi.fn().mockReturnValue(null),
  }
}

/**
 * Test data constants
 */
export const testConstants = {
  MAX_BATCH_SIZE: 999,
  MIN_BATCH_SIZE: 1,
  DEFAULT_POLL_INTERVAL: 1000, // 1 second
  DEFAULT_TIMEOUT: 5000, // 5 seconds
}

/**
 * Common error messages
 */
export const testErrorMessages = {
  invalidS3Url: 'Invalid S3 URL',
  batchSizeExceeded: 'Batch size cannot be greater than 999',
  missingQueryExecutionId: 'QueryExecutionId is undefined',
  queryFailed: 'Query failed',
  queryCancelled: 'Query was cancelled',
  unknownState: 'Unknown query state',
  fileNotFound: 'File not found',
  directoryCreationFailed: 'Failed to create directory',
}

/**
 * Helper to simulate query state transitions
 */
export function createQueryStateSequence(states: QueryExecutionState[]) {
  assert(states.length > 0, 'States array cannot be empty')
  let callIndex = 0

  return vi.fn(() => {
    const response = createMockQueryExecutionResponse(
      // biome-ignore lint/style/noNonNullAssertion: <will always be valid>
      states.at(callIndex)!,
    )
    callIndex += 1
    return Promise.resolve(response)
  })
}

/**
 * Helper to verify mock function calls
 */
export function verifyMockCalls(
  mockFn: ReturnType<typeof vi.fn>,
  expectedCalls: number,
) {
  return mockFn.mock.calls.length === expectedCalls
}

/**
 * Helper to get the last mock call arguments
 */
export function getLastMockCallArgs(mockFn: ReturnType<typeof vi.fn>) {
  const calls = mockFn.mock.calls
  if (calls.length === 0) return null
  return calls[calls.length - 1]
}

/**
 * Configuration for different test scenarios
 */
export const testScenarios = {
  successfulQuery: {
    sqlQuery: 'SELECT * FROM table WHERE status = "active"',
    expectedExecutionId: 'success-query-123',
  },
  failedQuery: {
    sqlQuery: 'SELECT * FROM non_existent_table',
    errorMessage: 'Table not found: non_existent_table',
  },
  largeDataSet: {
    recordCount: 10000,
    batchSize: 500,
    expectedBatches: 20,
  },
  smallDataSet: {
    recordCount: 50,
    batchSize: 100,
    expectedBatches: 1,
  },
}
