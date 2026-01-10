import { AthenaClient, QueryExecutionState } from '@aws-sdk/client-athena'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AthenaQueryClient } from '../athena.js'
import { AthenaQueryError } from '../errors.js'
import type { AthenaQueryClientConfig } from '../types.js'

// Mock AWS SDK
vi.mock('@aws-sdk/client-athena')

describe('AthenaQueryClient', () => {
  let client: AthenaQueryClient
  // biome-ignore lint: Mock object requires any type
  let mockAthenaClient: any
  const mockConfig: AthenaQueryClientConfig = {
    ClientConfig: { region: 'us-east-1' },
    Database: 'test_db',
    Catalog: 'test_catalog',
    WorkGroup: 'primary',
    s3Region: 'us-east-1',
    s3OutputLocation: 's3://test-bucket/results/',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAthenaClient = {
      send: vi.fn(),
    }
    // biome-ignore lint: Need function() for mockImplementation constructor
    ;(AthenaClient as any).mockImplementation(function () {
      return mockAthenaClient
    })
    client = new AthenaQueryClient(mockConfig)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create client with default configuration', () => {
      const config: AthenaQueryClientConfig = {
        ClientConfig: { region: 'us-west-2' },
        Database: 'my_db',
        Catalog: 'my_catalog',
        s3Region: 'us-west-2',
        s3OutputLocation: 's3://my-bucket/results/',
      }

      const newClient = new AthenaQueryClient(config)
      expect(newClient).toBeDefined()
    })

    it('should use primary as default workgroup', () => {
      const config: AthenaQueryClientConfig = {
        ClientConfig: { region: 'us-east-1' },
        Database: 'test_db',
        Catalog: 'test_catalog',
        s3Region: 'us-east-1',
        s3OutputLocation: 's3://test-bucket/results/',
      }

      const newClient = new AthenaQueryClient(config)
      expect(newClient).toBeDefined()
    })

    it('should use provided custom workgroup', () => {
      const config: AthenaQueryClientConfig = {
        ClientConfig: { region: 'us-east-1' },
        Database: 'test_db',
        Catalog: 'test_catalog',
        WorkGroup: 'custom_wg',
        s3Region: 'us-east-1',
        s3OutputLocation: 's3://test-bucket/results/',
      }

      const newClient = new AthenaQueryClient(config)
      expect(newClient).toBeDefined()
    })
  })

  describe('query method', () => {
    it('should successfully execute a query and return execution ID', async () => {
      const queryExecutionId = 'test-query-id-123'
      const sqlQuery = 'SELECT * FROM test_table'

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecutionId: queryExecutionId,
      })

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecution: {
          Status: { State: QueryExecutionState.SUCCEEDED },
        },
      })

      const result = await client.query(sqlQuery)

      expect(result).toBe(queryExecutionId)
      expect(mockAthenaClient.send).toHaveBeenCalledTimes(2)
    })

    it('should throw error when QueryExecutionId is undefined', async () => {
      const sqlQuery = 'SELECT * FROM test_table'

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecutionId: undefined,
      })

      await expect(client.query(sqlQuery)).rejects.toThrow(AthenaQueryError)
    })

    it('should handle query execution failure', async () => {
      const sqlQuery = 'SELECT * FROM test_table'
      const failureReason = 'Table not found'

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecutionId: 'query-id',
      })

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecution: {
          Status: {
            State: QueryExecutionState.FAILED,
            StateChangeReason: failureReason,
          },
        },
      })

      await expect(client.query(sqlQuery)).rejects.toThrow(AthenaQueryError)
    })

    it('should handle cancelled query state', async () => {
      const sqlQuery = 'SELECT * FROM test_table'

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecutionId: 'query-id',
      })

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecution: {
          Status: { State: QueryExecutionState.CANCELLED },
        },
      })

      await expect(client.query(sqlQuery)).rejects.toThrow(AthenaQueryError)
    })

    it('should handle unknown query state', async () => {
      const sqlQuery = 'SELECT * FROM test_table'

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecutionId: 'query-id',
      })

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecution: {
          Status: { State: 'UNKNOWN_STATE' },
        },
      })

      await expect(client.query(sqlQuery)).rejects.toThrow(AthenaQueryError)
    })

    it('should retry polling when query is in QUEUED state', async () => {
      const queryExecutionId = 'test-query-id'
      const sqlQuery = 'SELECT * FROM test_table'

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecutionId: queryExecutionId,
      })

      // First call: QUEUED
      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecution: {
          Status: { State: QueryExecutionState.QUEUED },
        },
      })

      // Second call: RUNNING
      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecution: {
          Status: { State: QueryExecutionState.RUNNING },
        },
      })

      // Third call: SUCCEEDED
      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecution: {
          Status: { State: QueryExecutionState.SUCCEEDED },
        },
      })

      const result = await client.query(sqlQuery)

      expect(result).toBe(queryExecutionId)
      expect(mockAthenaClient.send).toHaveBeenCalledTimes(4)
    })

    it('should handle errors during query setup', async () => {
      const sqlQuery = 'SELECT * FROM test_table'
      const sdkError = new Error('AWS SDK Error')

      mockAthenaClient.send.mockRejectedValueOnce(sdkError)

      const result = client.query(sqlQuery)
      await expect(result).rejects.toThrow()
    })

    it('should send request to AWS Athena', async () => {
      const queryExecutionId = 'test-query-id'
      const sqlQuery = 'SELECT * FROM test_table'

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecutionId: queryExecutionId,
      })

      mockAthenaClient.send.mockResolvedValueOnce({
        QueryExecution: {
          Status: { State: QueryExecutionState.SUCCEEDED },
        },
      })

      const result = await client.query(sqlQuery)

      expect(result).toBe(queryExecutionId)
      expect(mockAthenaClient.send).toHaveBeenCalledTimes(2)
    })
  })

  describe('AthenaQueryError', () => {
    it('should create error with message', () => {
      const error = new AthenaQueryError('Test error message')
      expect(error.message).toBe('Test error message')
      expect(error.name).toBe('AthenaQueryError')
    })

    it('should create error with message and execution ID', () => {
      const executionId = 'exec-id-123'
      const error = new AthenaQueryError('Test error', executionId)
      expect(error.message).toBe('Test error')
      expect(error.queryExecutionId).toBe(executionId)
    })

    it('should be an instance of Error', () => {
      const error = new AthenaQueryError('Test error')
      expect(error).toBeInstanceOf(Error)
    })
  })
})
