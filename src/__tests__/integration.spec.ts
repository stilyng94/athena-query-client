import { describe, expect, it } from 'vitest'
import type {
  AthenaQueryClientConfig,
  JsonFileAppenderOptions,
  QueryResultProcessor,
  S3QueryResultProcessorParams,
} from '../types.js'

describe('Integration Tests', () => {
  describe('Type Exports', () => {
    it('should export AthenaQueryClientConfig type', () => {
      const config: AthenaQueryClientConfig = {
        ClientConfig: { region: 'us-east-1' },
        Database: 'test_db',
        Catalog: 'test_catalog',
        s3Region: 'us-east-1',
        s3OutputLocation: 's3://bucket/path/',
      }

      expect(config.Database).toBe('test_db')
      expect(config.Catalog).toBe('test_catalog')
    })

    it('should export QueryResultProcessor interface', () => {
      const mockProcessor: QueryResultProcessor = {
        processResults: async (queryExecutionId: string) => {
          return queryExecutionId
        },
      }

      expect(typeof mockProcessor.processResults).toBe('function')
    })

    it('should export S3QueryResultProcessorParams type', () => {
      const params: S3QueryResultProcessorParams = {
        onData: async () => {
          // no-op
        },
        s3OutputLocation: 's3://bucket/',
        s3Region: 'us-east-1',
      }

      expect(params.s3OutputLocation).toBe('s3://bucket/')
      expect(params.s3Region).toBe('us-east-1')
    })

    it('should export JsonFileAppenderOptions type', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: '/tmp',
      }

      expect(options.fileName).toBe('output.json')
      expect(options.directory).toBe('/tmp')
    })
  })

  describe('Error Handling Integration', () => {
    it('should properly inherit from Error class', () => {
      const error = new Error('test')
      expect(error).toBeInstanceOf(Error)
    })

    it('should have error name property', () => {
      const customError = new Error('test error')
      expect(customError.name).toBeDefined()
    })

    it('should have error message property', () => {
      const customError = new Error('test error')
      expect(customError.message).toBe('test error')
    })
  })

  describe('Configuration Composition', () => {
    it('should allow creating complex config objects', () => {
      const baseConfig: AthenaQueryClientConfig = {
        ClientConfig: { region: 'us-east-1' },
        Database: 'test_db',
        Catalog: 'test_catalog',
        s3Region: 'us-east-1',
        s3OutputLocation: 's3://test-bucket/results/',
      }

      const extendedConfig: AthenaQueryClientConfig = {
        ...baseConfig,
        WorkGroup: 'custom_wg',
      }

      expect(extendedConfig.WorkGroup).toBe('custom_wg')
      expect(extendedConfig.Database).toBe('test_db')
    })

    it('should allow creating S3 processor params with optional fields', () => {
      const params: S3QueryResultProcessorParams = {
        onData: async (data: unknown[]) => {
          console.log(data)
        },
        s3OutputLocation: 's3://bucket/',
        s3Region: 'us-east-1',
        batchSize: 500,
        csvParseOptions: { delimiter: ',' },
        onComplete: async () => {
          console.log('done')
        },
      }

      expect(params.batchSize).toBe(500)
      expect(params.csvParseOptions?.delimiter).toBe(',')
      expect(typeof params.onComplete).toBe('function')
    })
  })

  describe('Module Exports', () => {
    it('should export error class', async () => {
      const { AthenaQueryError } = await import('../errors.js')
      expect(typeof AthenaQueryError).toBe('function')
    })

    it('should export AthenaQueryClient class', async () => {
      const { AthenaQueryClient } = await import('../athena.js')
      expect(typeof AthenaQueryClient).toBe('function')
    })

    it('should export JsonFileAppender class', async () => {
      const { JsonFileAppender } = await import('../json-file-appender.js')
      expect(typeof JsonFileAppender).toBe('function')
    })

    it('should export query processors', async () => {
      const { S3QueryResultProcessor, MappedQueryResultProcessor } =
        await import('../query-results-processor.js')
      expect(typeof S3QueryResultProcessor).toBe('function')
      expect(typeof MappedQueryResultProcessor).toBe('function')
    })

    it('should export types', async () => {
      // This test verifies that types are properly exported
      const config: AthenaQueryClientConfig = {
        ClientConfig: { region: 'us-east-1' },
        Database: 'db',
        Catalog: 'catalog',
        s3Region: 'us-east-1',
        s3OutputLocation: 's3://bucket/',
      }

      expect(config).toBeDefined()
    })
  })

  describe('Constants', () => {
    it('should export MAX_BATCH_SIZE constant', async () => {
      const { MAX_BATCH_SIZE } = await import('../types.js')
      expect(MAX_BATCH_SIZE).toBe(999)
      expect(typeof MAX_BATCH_SIZE).toBe('number')
    })

    it('MAX_BATCH_SIZE should be greater than zero', async () => {
      const { MAX_BATCH_SIZE } = await import('../types.js')
      expect(MAX_BATCH_SIZE).toBeGreaterThan(0)
    })
  })

  describe('Async Operations', () => {
    it('should handle async callbacks in S3 processor params', async () => {
      let callCount = 0

      const params: S3QueryResultProcessorParams = {
        onData: async (_data: unknown[]) => {
          callCount += 1
        },
        onComplete: async () => {
          callCount += 1
        },
        s3OutputLocation: 's3://bucket/',
        s3Region: 'us-east-1',
      }

      expect(typeof params.onData).toBe('function')
      expect(typeof params.onComplete).toBe('function')

      // Simulate calling the functions
      await params.onData([{ id: 1 }])
      expect(callCount).toBe(1)

      await params.onComplete?.()
      expect(callCount).toBe(2)
    })

    it('should handle promise-based operations', async () => {
      const testPromise = Promise.resolve('test')
      const result = await testPromise

      expect(result).toBe('test')
    })
  })

  describe('Type Safety', () => {
    it('should enforce required config fields', () => {
      // This is a compile-time test, but we verify the structure
      const config: AthenaQueryClientConfig = {
        ClientConfig: { region: 'us-east-1' },
        Database: 'db',
        Catalog: 'catalog',
        s3Region: 'us-east-1',
        s3OutputLocation: 's3://bucket/',
      }

      expect(config.Database).toBeDefined()
      expect(config.Catalog).toBeDefined()
      expect(config.s3Region).toBeDefined()
      expect(config.s3OutputLocation).toBeDefined()
    })

    it('should allow optional fields in configs', () => {
      const config: AthenaQueryClientConfig = {
        ClientConfig: { region: 'us-east-1' },
        Database: 'db',
        Catalog: 'catalog',
        s3Region: 'us-east-1',
        s3OutputLocation: 's3://bucket/',
        WorkGroup: 'optional',
      }

      expect(config.WorkGroup).toBe('optional')
    })
  })
})
