import {
  AthenaClient,
  type AthenaClientConfig,
  GetQueryExecutionCommand,
  QueryExecutionState,
  type ResultReuseConfiguration,
  StartQueryExecutionCommand,
  type StartQueryExecutionCommandInput,
} from "@aws-sdk/client-athena";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parse, type Options } from "csv-parse";
import type { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import {
  EMPTY,
  type Observable,
  defer,
  firstValueFrom,
  from,
  of,
  throwError,
  timer,
} from "rxjs";
import { expand, filter, switchMap, take } from "rxjs/operators";

/** Maximum number of records to process in a single batch */
const MAX_BATCH_SIZE = 999;

/**
 * Configuration interface for AthenaQueryClient
 * @interface AthenaQueryClientConfig
 */
export interface AthenaQueryClientConfig {
  /** AWS SDK Athena client configuration */
  ClientConfig: AthenaClientConfig;
  /** AWS Athena database name. The database must exist in the catalog */
  Database: string;
  /** AWS Athena data source catalog name */
  Catalog: string;
  /** The name of the workgroup in which the query is being started. Optional, defaults to 'primary' */
  WorkGroup?: string;
  /** Configuration for result reuse in Athena */
  ResultReuseConfiguration?: ResultReuseConfiguration;
  /** S3 location where query results will be stored */
  s3OutputLocation: string;
  /** AWS region for S3 operations */
  s3Region: string;
}

export interface GetResultsFromS3Params {
  /**
   * The ID of the query execution
   */
  queryExecutionId: string;
  /**
   * The S3 bucket where the query results are stored
   */
  bucket: string;
  /**
   * Callback function to process each batch of data
   */
  onData: (data: unknown[]) => Promise<void>;
  /**
   * Optional: The maximum number of records to process in a single batch
   * @default 999
   */
  batchSize?: number;

  /**
   * Options for CSV parsing
   * @default { columns: true }
   */
  csvParseOptions?: Options;
}

/**
 * Client for executing queries against AWS Athena and retrieving results
 * @class AthenaQueryClient
 */
export class AthenaQueryClient {
  readonly #database: string;
  readonly #client: AthenaClient;
  readonly #catalog: string;
  readonly #workGroup: string;
  readonly #resultReuseConfiguration: ResultReuseConfiguration;
  readonly #s3Client: S3Client;
  readonly #s3OutputLocation: string;

  /**
   * Creates an instance of AthenaQueryClient
   * @param {AthenaQueryClientConfig} config - Configuration object for the client
   */
  constructor(config: AthenaQueryClientConfig) {
    this.#client = new AthenaClient({
      ...config.ClientConfig,
      region: config.s3Region,
    });
    this.#database = config.Database;
    this.#catalog = config.Catalog;
    this.#workGroup = config.WorkGroup || "primary";
    this.#resultReuseConfiguration = config.ResultReuseConfiguration || {
      ResultReuseByAgeConfiguration: { Enabled: true, MaxAgeInMinutes: 60 },
    };
    this.#s3OutputLocation = config.s3OutputLocation;
    this.#s3Client = new S3Client({ region: config.s3Region });
  }

  /**
   * Executes an SQL query in Athena and returns the QueryExecutionId
   * @param {string} sqlQuery - The SQL query string to execute
   * @returns {Promise<string>} Promise resolving to QueryExecutionId
   * @throws {Error} If query execution fails or encounters an unknown state
   */
  async query(sqlQuery: string): Promise<string> {
    console.log("Executing query:", sqlQuery);

    const queryExecutionInput: StartQueryExecutionCommandInput = {
      QueryString: sqlQuery,
      QueryExecutionContext: {
        Database: this.#database,
        Catalog: this.#catalog,
      },
      WorkGroup: this.#workGroup,
      ResultReuseConfiguration: this.#resultReuseConfiguration,
      ResultConfiguration: { OutputLocation: this.#s3OutputLocation },
    };

    const { QueryExecutionId } = await this.#client.send(
      new StartQueryExecutionCommand(queryExecutionInput)
    );
    console.log("Query execution started with ID:", QueryExecutionId);

    if (!QueryExecutionId) {
      throw new Error("Failed to start query: QueryExecutionId is undefined");
    }

    return await firstValueFrom(
      this.#checkQueryExecutionState(QueryExecutionId)
    ).catch((error) => {
      console.error("Query execution failed:", error);
      throw new Error(`Query execution failed: ${error.message}`);
    });
  }

  /**
   * Retrieves query results from S3 and processes them in batches
   * @param {GetResultsFromS3Params} params - Parameters for retrieving query results from S3
   * @returns {Promise<void>}
   */
  async getResultsFromS3({
    queryExecutionId,
    onData,
    batchSize = MAX_BATCH_SIZE,
    csvParseOptions = { columns: true },
  }: GetResultsFromS3Params): Promise<void> {
    if (batchSize > MAX_BATCH_SIZE) {
      throw new Error(`batch size cannot be greater than ${MAX_BATCH_SIZE}`);
    }

    // Get the S3 location of results
    const s3Location = `${this.#s3OutputLocation}/${queryExecutionId}.csv`;
    const { Bucket, Key } = this.#parseS3Url(s3Location);
    console.log("Fetching query results from S3:", s3Location);

    // Get the object from S3
    const response = await this.#s3Client.send(
      new GetObjectCommand({ Bucket, Key })
    );
    console.log("S3 response metadata:", response.$metadata);

    if (!response.Body) {
      console.error(`Failed to fetch file: ${Bucket}/${Key}`);
      throw new Error(`Failed to fetch file: ${Bucket}/${Key}`);
    }
    let batches: unknown[] = [];
    let totalProcessed = 0;

    // Set up CSV parser
    const parser = (response.Body as Readable).pipe(
      parse({ ...csvParseOptions })
    );
    parser.on("readable", async () => {
      const record = parser.read();
      while (record !== null) {
        // Work with each record
        batches.push(record);
        if (batches.length >= batchSize) {
          console.log(`Processing batch of ${batches.length} records...`);
          await onData(batches);
          totalProcessed += batches.length;
          console.log(`Total records processed: ${totalProcessed}`);
          batches = [];
        }
      }
    });
    // Wait for parsing to complete
    await finished(parser);
    if (batches.length > 0) {
      console.log(`Processing final batch of ${batches.length} records...`);
      await onData(batches);
      totalProcessed += batches.length;
      console.log(`Final total records processed: ${totalProcessed}`);
    }
  }

  /**
   * Polls the Athena query execution state until completion
   * @param {string} QueryExecutionId - The ID of the query being executed
   * @returns {Observable<string>} Observable emitting QueryExecutionId on success
   */
  #checkQueryExecutionState(QueryExecutionId: string): Observable<string> {
    return defer(() =>
      from(
        this.#client.send(new GetQueryExecutionCommand({ QueryExecutionId }))
      )
    ).pipe(
      switchMap((response) => {
        const state = response.QueryExecution?.Status?.State;
        console.log(`Query execution state: ${state}`);

        switch (state) {
          case QueryExecutionState.SUCCEEDED:
            return of(QueryExecutionId);
          case QueryExecutionState.FAILED: {
            const errorMessage =
              response.QueryExecution?.Status?.StateChangeReason ||
              "Unknown reason";
            console.error("Query failed:", errorMessage);
            return throwError(() => new Error(`Query failed: ${errorMessage}`));
          }
          case QueryExecutionState.CANCELLED:
            return throwError(() => new Error("Query was cancelled"));
          case QueryExecutionState.QUEUED:
          case QueryExecutionState.RUNNING:
            return of(null); // Continue polling
          default:
            return throwError(() => new Error(`Unknown query state: ${state}`));
        }
      }),
      expand(
        (result) =>
          result === null
            ? timer(1000).pipe(
                switchMap(() =>
                  this.#checkQueryExecutionState(QueryExecutionId)
                )
              )
            : EMPTY // End recursion once the result is non-null
      ),
      filter((result) => result !== null),
      take(1)
    );
  }

  /**
   * Parses an S3 URL into bucket and key components
   * @param {string} url - The S3 URL to parse
   * @returns {{ Bucket: string; Key: string }} Object containing bucket and key
   */
  #parseS3Url(url: string): { Bucket: string; Key: string } {
    const parsedUrl = new URL(url);
    return {
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      Bucket: parsedUrl.hostname.split(".")[0]!,
      Key: parsedUrl.pathname.slice(1),
    };
  }
}
