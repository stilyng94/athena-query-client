import type { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import {
  GetQueryResultsCommand,
  type ResultSet,
  type Row,
} from '@aws-sdk/client-athena'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { parse } from 'csv-parse'
import {
  MAX_BATCH_SIZE,
  type MappedQueryResultProcessorParams,
  type QueryResultProcessor,
  type S3QueryResultProcessorParams,
} from './types.js'

/**
 * Processes Athena query results stored in S3
 */
export class S3QueryResultProcessor implements QueryResultProcessor {
  readonly #batchSize = MAX_BATCH_SIZE
  readonly #s3Client: S3Client
  readonly #s3OutputLocation: string

  /**
   * Creates a new S3QueryResultProcessor
   * @param {S3QueryResultProcessorParams} config - Configuration parameters
   */
  constructor(private readonly config: S3QueryResultProcessorParams) {
    this.#batchSize = this.#validateBatchSize(config.batchSize)
    this.#s3OutputLocation = config.s3OutputLocation
    this.#s3Client = new S3Client({ region: config.s3Region })
  }

  /**
   * Processes query results from S3
   * @param {string} queryExecutionId - The ID of the query execution
   * @returns {Promise<void>} Promise that resolves when processing is complete
   */
  async processResults(queryExecutionId: string): Promise<void> {
    // Get the S3 location of results
    const s3Location = `${this.#s3OutputLocation}/${queryExecutionId}.csv`
    const { Bucket, Key } = this.#parseS3Url(s3Location)
    console.log('Fetching query results from S3:', s3Location)

    const responseStream = await this.#fetchS3Object(Bucket, Key)
    return this.#processStreamingResults(responseStream)
  }

  /**
   * Processes streaming results from S3
   * @param {Readable} stream - The readable stream of results
   * @returns {Promise<void>} Promise that resolves when processing is complete
   */
  async #processStreamingResults(stream: Readable): Promise<void> {
    const batch: unknown[] = []
    let totalProcessed = 0

    const parser = stream.pipe(
      parse({ ...(this.config.csvParseOptions ?? {}) }),
    )

    try {
      parser.on('readable', async () => {
        const record = parser.read()
        while (record !== null) {
          // Work with each record
          batch.push(record)
          if (batch.length >= this.#batchSize) {
            console.log(`Processing batch of ${batch.length} records...`)
            await this.#processBatch(batch)
            totalProcessed += batch.length
            batch.length = 0 // Clear array efficiently
            console.log(`Total records processed: ${totalProcessed}`)
          }
        }
      })

      // Wait for parsing to complete
      await finished(parser)
      // Process remaining records
      if (batch.length > 0) {
        console.log(`Processing final batch of ${batch.length} records...`)
        await this.#processBatch(batch)
        totalProcessed += batch.length
        console.log(`Final total records processed: ${totalProcessed}`)
      }
      await this.config?.onComplete?.()
    } catch (error) {
      throw new Error(
        `Error processing results: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  /**
   * Processes a batch of records
   * @param {unknown[]} batch - Array of records to process
   * @returns {Promise<void>} Promise that resolves when batch is processed
   */
  async #processBatch(batch: unknown[]): Promise<void> {
    try {
      await this.config.onData(batch)
    } catch (error) {
      throw new Error(
        `Error processing batch: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  /**
   * Validates the batch size configuration
   * @param {number} [batchSize] - The batch size to validate
   * @returns {number} The validated batch size
   * @throws {Error} If batch size exceeds maximum allowed
   */
  #validateBatchSize(batchSize?: number): number {
    if (!batchSize) return MAX_BATCH_SIZE
    if (batchSize > MAX_BATCH_SIZE) {
      throw new Error(`Batch size cannot be greater than ${MAX_BATCH_SIZE}`)
    }
    return batchSize
  }

  /**
   * Fetches an object from S3
   * @param {string} Bucket - The S3 bucket name
   * @param {string} Key - The S3 object key
   * @returns {Promise<Readable>} Promise resolving to readable stream
   * @throws {Error} If object fetch fails
   */
  async #fetchS3Object(Bucket: string, Key: string): Promise<Readable> {
    const response = await this.#s3Client.send(
      new GetObjectCommand({ Bucket, Key }),
    )

    if (!response.Body) {
      throw new Error(`Failed to fetch file: ${Bucket}/${Key}`)
    }
    console.log('S3 response metadata:', response.$metadata)

    return response.Body as Readable
  }

  /**
   * Parses an S3 URL into bucket and key components
   * @param {string} url - The S3 URL to parse
   * @returns {{ Bucket: string; Key: string }} Object containing bucket and key
   * @throws {Error} If URL is invalid or missing bucket name
   */
  #parseS3Url(url: string): { Bucket: string; Key: string } {
    try {
      const parsedUrl = new URL(url)
      const bucket = parsedUrl.hostname.split('.')[0]

      if (!bucket) {
        throw new Error('Invalid S3 URL: missing bucket name')
      }

      return {
        Bucket: bucket,
        Key: parsedUrl.pathname.slice(1),
      }
    } catch (error) {
      throw new Error(
        `Invalid S3 URL: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }
}

/**
 * Processes Athena query results by mapping them to objects
 */
export class MappedQueryResultProcessor implements QueryResultProcessor {
  /**
   * Creates a new MappedQueryResultProcessor
   * @param {MappedQueryResultProcessorParams} config - Configuration parameters
   */
  constructor(private readonly config: MappedQueryResultProcessorParams) {}

  /**
   * Processes query results by mapping them to objects
   * @param {string} queryExecutionId - The ID of the query execution
   * @returns {Promise<Record<string, string>[]>} Promise resolving to array of mapped objects
   */
  async processResults(
    queryExecutionId: string,
  ): Promise<Record<string, string>[]> {
    console.log('Fetching results for QueryExecutionId:', queryExecutionId)

    try {
      const resultSet = await this.#fetchQueryResults(queryExecutionId)
      return this.#extractRows(resultSet)
    } catch (error) {
      throw new Error(
        `Error processing results: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  /**
   * Fetches query results from Athena
   * @param {string} queryExecutionId - The ID of the query execution
   * @returns {Promise<ResultSet>} Promise resolving to Athena ResultSet
   * @throws {Error} If results are empty or undefined
   */
  async #fetchQueryResults(queryExecutionId: string): Promise<ResultSet> {
    const response = await this.config.athenaClient.send(
      new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId }),
    )

    if (!response.ResultSet) {
      throw new Error('Query results are empty or undefined')
    }

    return response.ResultSet
  }

  /**
   * Extracts column headers from result rows
   * @param {Row[]} rows - Array of result rows
   * @returns {string[]} Array of header names
   * @throws {Error} If no headers are found
   */
  #extractHeaders(rows: Row[]): string[] {
    const headers = rows[0]?.Data?.map((column) => column.VarCharValue || '')

    if (!headers || headers.length === 0) {
      throw new Error('No headers found in the result set')
    }

    return headers
  }

  /**
   * Maps a row to an object using column headers as keys
   * @param {Row} row - The row to map
   * @param {string[]} headers - Array of column headers
   * @returns {Record<string, string>} Object with header-value pairs
   */
  #mapRowToObject(row: Row, headers: string[]): Record<string, string> {
    const mappedRow: Record<string, string> = {}

    row.Data?.forEach((value, index) => {
      const header = headers[index]
      if (header) {
        mappedRow[header] = value.VarCharValue || ''
      }
    })

    return mappedRow
  }

  /**
   * Extracts  Athena ResultSet data into an array of key-value objects
   * Extracts Athena ResultSet data into an array of key-value objects
   * @private
   * @param {ResultSet} resultSet - The ResultSet object returned by Athena
   * @returns {Record<string, string>[]} Array of objects representing query rows
   * @throws {Error} If no headers are found
   */
  #extractRows(resultSet: ResultSet): Record<string, string>[] {
    const { Rows } = resultSet
    if (!Rows || Rows.length === 0) {
      console.error('No rows found in result set')
      return []
    }
    const headers = this.#extractHeaders(Rows)
    if (!headers.length) {
      throw new Error('No headers found in the result set')
    }
    return Rows.slice(1).map((row) => this.#mapRowToObject(row, headers))
  }
}
