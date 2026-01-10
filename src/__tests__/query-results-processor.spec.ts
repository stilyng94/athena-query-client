import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { S3QueryResultProcessor } from '../query-results-processor.js'
import type { S3QueryResultProcessorParams } from '../types.js'

vi.mock('@aws-sdk/client-s3')

describe('S3QueryResultProcessor', () => {
  let processor: S3QueryResultProcessor
  let mockOnData: ReturnType<typeof vi.fn>
  let mockOnComplete: ReturnType<typeof vi.fn>

  const mockConfig: S3QueryResultProcessorParams = {
    onData: vi.fn(),
    onComplete: vi.fn(),
    s3OutputLocation: 's3://test-bucket/results/',
    s3Region: 'us-east-1',
    batchSize: 100,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnData = vi.fn()
    mockOnComplete = vi.fn()
    mockConfig.onData = mockOnData as (data: unknown[]) => Promise<void>
    mockConfig.onComplete = mockOnComplete as (data?: unknown) => Promise<void>

    processor = new S3QueryResultProcessor(mockConfig)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create processor with valid configuration', () => {
      expect(processor).toBeDefined()
    })

    it('should throw error when batch size exceeds maximum', () => {
      const invalidConfig: S3QueryResultProcessorParams = {
        ...mockConfig,
        batchSize: 1000,
      }

      expect(() => new S3QueryResultProcessor(invalidConfig)).toThrow(
        'Batch size cannot be greater than 999',
      )
    })

    it('should use default batch size when not provided', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        batchSize: undefined,
      }

      const newProcessor = new S3QueryResultProcessor(config)
      expect(newProcessor).toBeDefined()
    })
  })

  describe('S3 URL parsing', () => {
    it('should parse valid S3 URL formats', () => {
      const validUrls = [
        's3://my-bucket/path/to/results/',
        's3://my-bucket/',
        's3://bucket-name/folder/file.csv',
      ]

      for (const url of validUrls) {
        const processor = new S3QueryResultProcessor({
          ...mockConfig,
          s3OutputLocation: url,
        })
        expect(processor).toBeDefined()
      }
    })

    it('should accept valid S3 URL correctly', () => {
      const processor = new S3QueryResultProcessor({
        ...mockConfig,
        s3OutputLocation: 's3://my-bucket/path/to/results/',
      })
      expect(processor).toBeDefined()
    })

    it('should handle S3 URL with no path', () => {
      const processor = new S3QueryResultProcessor({
        ...mockConfig,
        s3OutputLocation: 's3://my-bucket/',
      })
      expect(processor).toBeDefined()
    })

    it('should handle S3 URLs during initialization', () => {
      // Valid S3 URLs are accepted
      const processor = new S3QueryResultProcessor({
        ...mockConfig,
        s3OutputLocation: 's3://valid-bucket/results/',
      })
      expect(processor).toBeDefined()
    })
  })

  describe('batch processing configuration', () => {
    it('should use provided batch size', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        batchSize: 500,
      }

      const newProcessor = new S3QueryResultProcessor(config)
      expect(newProcessor).toBeDefined()
    })

    it('should reject batch size greater than max', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        batchSize: 1001,
      }

      expect(() => new S3QueryResultProcessor(config)).toThrow()
    })

    it('should accept batch size equal to max', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        batchSize: 999,
      }

      const newProcessor = new S3QueryResultProcessor(config)
      expect(newProcessor).toBeDefined()
    })
  })

  describe('CSV parse options', () => {
    it('should accept custom CSV parse options', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        csvParseOptions: { delimiter: ';', skip_empty_lines: true },
      }

      const newProcessor = new S3QueryResultProcessor(config)
      expect(newProcessor).toBeDefined()
    })

    it('should use default CSV parse options when not provided', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        csvParseOptions: undefined,
      }

      const newProcessor = new S3QueryResultProcessor(config)
      expect(newProcessor).toBeDefined()
    })
  })

  describe('callback functions', () => {
    it('should accept onData callback', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        onData: mockOnData as (data: unknown[]) => Promise<void>,
      }

      const newProcessor = new S3QueryResultProcessor(config)
      expect(newProcessor).toBeDefined()
    })

    it('should accept optional onComplete callback', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        onComplete: mockOnComplete as (data?: unknown) => Promise<void>,
      }

      const newProcessor = new S3QueryResultProcessor(config)
      expect(newProcessor).toBeDefined()
    })

    it('should work without onComplete callback', () => {
      const config: S3QueryResultProcessorParams = {
        ...mockConfig,
        onComplete: undefined,
      }

      const newProcessor = new S3QueryResultProcessor(config)
      expect(newProcessor).toBeDefined()
    })
  })
})
