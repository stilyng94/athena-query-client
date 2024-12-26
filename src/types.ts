import type {
  AthenaClient,
  AthenaClientConfig,
  ResultReuseConfiguration,
} from '@aws-sdk/client-athena'
import type { Options } from 'csv-parse'

/** Maximum number of records to process in a single batch */
export const MAX_BATCH_SIZE: number = 999

/**
 * Configuration interface for AthenaQueryClient
 * @interface AthenaQueryClientConfig
 */
export interface AthenaQueryClientConfig {
  /** AWS SDK Athena client configuration */
  ClientConfig: AthenaClientConfig
  /** AWS Athena database name. The database must exist in the catalog */
  Database: string
  /** AWS Athena data source catalog name */
  Catalog: string
  /** The name of the workgroup in which the query is being started. Optional, defaults to 'primary' */
  WorkGroup?: string
  /** Configuration for result reuse in Athena */
  ResultReuseConfiguration?: ResultReuseConfiguration
  /** AWS region for S3 operations */
  s3Region: string
  /** S3 location where query results will be stored */
  s3OutputLocation: string
}
/**
 * Interface for processing Athena query results
 */
export interface QueryResultProcessor {
  /**
   * Processes the results of an Athena query execution
   * @param {string} queryExecutionId - The ID of the query execution
   * @returns {Promise<unknown>} Promise resolving to the processed results
   */
  processResults(queryExecutionId: string): Promise<unknown>
}
export interface S3QueryResultProcessorParams {
  /**
   * Callback function to process each batch of data
   */
  onData: (data: unknown[]) => Promise<void>
  /**
   * Optional: The maximum number of records to process in a single batch
   * @default 999
   */
  batchSize?: number

  /**
   * Options for CSV parsing
   * @default { columns: true }
   */
  csvParseOptions?: Options

  /** S3 location where query results will be stored */
  s3OutputLocation: string
  /** AWS region for S3 operations */
  s3Region: string
}

export interface MappedQueryResultProcessorParams {
  /**
   *
   */
  athenaClient: AthenaClient
}

/**
 *@description Options for configuring the JsonFileAppender
 */
export interface JsonFileAppenderOptions {
  /** Name of the file to append to */
  fileName: string
  /** Directory path where the file is located */
  directory: string
}
