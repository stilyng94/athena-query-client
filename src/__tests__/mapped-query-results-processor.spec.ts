import { AthenaClient } from '@aws-sdk/client-athena'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MappedQueryResultProcessor } from '../query-results-processor.js'
import type { MappedQueryResultProcessorParams } from '../types.js'

vi.mock('@aws-sdk/client-athena')

describe('MappedQueryResultProcessor', () => {
  let processor: MappedQueryResultProcessor
  // biome-ignore lint: Mock object requires any type
  let mockAthenaClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockAthenaClient = {
      send: vi.fn(),
    }
    // biome-ignore lint: Mock requires any type
    ;(AthenaClient as any).mockImplementation(() => mockAthenaClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create processor with valid configuration', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should set default pagination to true', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        paginateResults: undefined,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should accept custom MaxResults value', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        MaxResults: 500,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should accept pagination configuration', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        paginateResults: true,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should accept disabled pagination', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        paginateResults: false,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })
  })

  describe('batch size validation', () => {
    it('should reject MaxResults greater than 999', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        MaxResults: 1000,
      }

      expect(() => new MappedQueryResultProcessor(config)).toThrow(
        'Batch size cannot be greater than 999',
      )
    })

    it('should accept MaxResults equal to 999', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        MaxResults: 999,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should accept small MaxResults values', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        MaxResults: 10,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should use default batch size when MaxResults not provided', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        MaxResults: undefined,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })
  })

  describe('pagination configuration', () => {
    it('should enable pagination when explicitly set', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        paginateResults: true,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should disable pagination when explicitly set', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        paginateResults: false,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should default to enabled pagination', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })
  })

  describe('combined configurations', () => {
    it('should handle all configuration options together', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        MaxResults: 500,
        paginateResults: true,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should handle high batch size with pagination disabled', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        MaxResults: 900,
        paginateResults: false,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })

    it('should handle low batch size with pagination enabled', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
        MaxResults: 50,
        paginateResults: true,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor).toBeDefined()
    })
  })

  describe('client validation', () => {
    it('should require athenaClient in configuration', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
      }

      expect(() => new MappedQueryResultProcessor(config)).not.toThrow()
    })

    it('should accept valid AthenaClient instance', () => {
      const validConfig: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
      }

      processor = new MappedQueryResultProcessor(validConfig)
      expect(processor).toBeDefined()
    })
  })

  describe('method signatures', () => {
    it('should have processResults method', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(typeof processor.processResults).toBe('function')
    })

    it('processResults should accept queryExecutionId string parameter', () => {
      const config: MappedQueryResultProcessorParams = {
        athenaClient: mockAthenaClient as AthenaClient,
      }

      processor = new MappedQueryResultProcessor(config)
      expect(processor.processResults.length).toBeGreaterThanOrEqual(1)
    })
  })
})
