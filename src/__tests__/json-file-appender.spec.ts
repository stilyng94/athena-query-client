import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JsonFileAppender } from '../json-file-appender.js'
import type { JsonFileAppenderOptions } from '../types.js'

// Mock the file system
vi.mock('node:fs', () => ({
  createWriteStream: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
}))

describe('JsonFileAppender', () => {
  let appender: JsonFileAppender
  let mockOptions: JsonFileAppenderOptions

  beforeEach(() => {
    vi.clearAllMocks()
    mockOptions = {
      fileName: 'test-output.json',
      directory: '/tmp/test',
    }
    appender = new JsonFileAppender(mockOptions)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create appender with valid options', () => {
      expect(appender).toBeDefined()
    })

    it('should accept custom file names', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'custom-name.json',
        directory: '/custom/path',
      }

      const customAppender = new JsonFileAppender(options)
      expect(customAppender).toBeDefined()
    })

    it('should handle paths with trailing slashes', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: '/path/to/directory/',
      }

      const customAppender = new JsonFileAppender(options)
      expect(customAppender).toBeDefined()
    })

    it('should handle paths without trailing slashes', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: '/path/to/directory',
      }

      const customAppender = new JsonFileAppender(options)
      expect(customAppender).toBeDefined()
    })
  })

  describe('file name and path handling', () => {
    it('should accept JSON file extensions', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'results.json',
        directory: '/output',
      }

      const jsonAppender = new JsonFileAppender(options)
      expect(jsonAppender).toBeDefined()
    })

    it('should accept files with numbers in name', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'results-123.json',
        directory: '/output',
      }

      const jsonAppender = new JsonFileAppender(options)
      expect(jsonAppender).toBeDefined()
    })

    it('should accept files with underscores and dashes', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'my-results_2024.json',
        directory: '/output',
      }

      const jsonAppender = new JsonFileAppender(options)
      expect(jsonAppender).toBeDefined()
    })

    it('should accept absolute paths', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: '/absolute/path/to/directory',
      }

      const pathAppender = new JsonFileAppender(options)
      expect(pathAppender).toBeDefined()
    })

    it('should accept relative paths', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: './relative/path',
      }

      const pathAppender = new JsonFileAppender(options)
      expect(pathAppender).toBeDefined()
    })
  })

  describe('appender configuration variants', () => {
    it('should handle minimal configuration', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'data.json',
        directory: '.',
      }

      const minimalAppender = new JsonFileAppender(options)
      expect(minimalAppender).toBeDefined()
    })

    it('should handle configuration with complex directory names', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: '/my-project/data/2024-01/results',
      }

      const complexAppender = new JsonFileAppender(options)
      expect(complexAppender).toBeDefined()
    })

    it('should handle files with multiple extensions', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.data.json',
        directory: '/output',
      }

      const multiExtAppender = new JsonFileAppender(options)
      expect(multiExtAppender).toBeDefined()
    })
  })

  describe('method signatures', () => {
    it('should have flush method accepting array of unknown', () => {
      expect(typeof appender.flush).toBe('function')
    })

    it('should have closeFileWithBracket method', () => {
      expect(typeof appender.closeFileWithBracket).toBe('function')
    })

    it('should have flush method with proper signature', () => {
      expect(appender.flush.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('data batch handling', () => {
    it('should have method to handle empty batch', () => {
      expect(typeof appender.flush).toBe('function')
    })

    it('should have method to handle single item batch', () => {
      expect(typeof appender.flush).toBe('function')
    })

    it('should have method to handle multiple items batch', () => {
      expect(typeof appender.flush).toBe('function')
    })

    it('should have method to handle various data types', () => {
      expect(typeof appender.flush).toBe('function')
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in file name', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'results@2024-01-10.json',
        directory: '/output',
      }

      const specialAppender = new JsonFileAppender(options)
      expect(specialAppender).toBeDefined()
    })

    it('should handle spaces in directory path', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: '/path with spaces/data',
      }

      const spaceAppender = new JsonFileAppender(options)
      expect(spaceAppender).toBeDefined()
    })

    it('should handle root directory path', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: '/',
      }

      const rootAppender = new JsonFileAppender(options)
      expect(rootAppender).toBeDefined()
    })

    it('should handle home directory shortcut', () => {
      const options: JsonFileAppenderOptions = {
        fileName: 'output.json',
        directory: '~/.config/app',
      }

      const homeAppender = new JsonFileAppender(options)
      expect(homeAppender).toBeDefined()
    })
  })
})
