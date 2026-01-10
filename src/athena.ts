import {
  AthenaClient,
  GetQueryExecutionCommand,
  QueryExecutionState,
  type ResultReuseConfiguration,
  StartQueryExecutionCommand,
  type StartQueryExecutionCommandInput,
} from '@aws-sdk/client-athena'
import {
  defer,
  EMPTY,
  firstValueFrom,
  from,
  type Observable,
  of,
  throwError,
  timer,
} from 'rxjs'
import { expand, filter, switchMap, take } from 'rxjs/operators'
import { AthenaQueryError } from './errors.js'
import type { AthenaQueryClientConfig } from './types.js'

/**
 * Client for executing queries against AWS Athena and retrieving results
 * @class AthenaQueryClient
 */
export class AthenaQueryClient {
  readonly #database: string
  readonly #client: AthenaClient
  readonly #catalog: string
  readonly #workGroup: string
  readonly #resultReuseConfiguration: ResultReuseConfiguration
  readonly #s3OutputLocation: string

  /**
   * Creates an instance of AthenaQueryClient
   * @param {AthenaQueryClientConfig} config - Configuration object for the client
   */
  constructor(config: AthenaQueryClientConfig) {
    this.#client = new AthenaClient({
      ...config.ClientConfig,
      region: config.s3Region,
    })
    this.#database = config.Database
    this.#catalog = config.Catalog
    this.#workGroup = config.WorkGroup || 'primary'
    this.#resultReuseConfiguration = config.ResultReuseConfiguration || {
      ResultReuseByAgeConfiguration: { Enabled: true, MaxAgeInMinutes: 60 },
    }
    this.#s3OutputLocation = config.s3OutputLocation
  }

  /**
   * Executes an SQL query in Athena and returns the QueryExecutionId
   * @param {string} sqlQuery - The SQL query string to execute
   * @returns {Promise<string>} Promise resolving to QueryExecutionId
   * @throws {Error} If query execution fails or encounters an unknown state
   */
  async query(sqlQuery: string): Promise<string> {
    console.log('Executing query:', sqlQuery)

    const queryExecutionInput: StartQueryExecutionCommandInput = {
      QueryString: sqlQuery,
      QueryExecutionContext: {
        Database: this.#database,
        Catalog: this.#catalog,
      },
      WorkGroup: this.#workGroup,
      ResultReuseConfiguration: this.#resultReuseConfiguration,
      ResultConfiguration: { OutputLocation: this.#s3OutputLocation },
    }

    const { QueryExecutionId } = await this.#client.send(
      new StartQueryExecutionCommand(queryExecutionInput),
    )
    console.log('Query execution started with ID:', QueryExecutionId)

    if (!QueryExecutionId) {
      throw new AthenaQueryError(
        'Failed to start query: QueryExecutionId is undefined',
      )
    }

    return await firstValueFrom(
      this.#checkQueryExecutionState(QueryExecutionId),
    ).catch((error) => {
      console.error('Query execution failed:', error)
      throw new AthenaQueryError(`Query execution failed: ${error.message}`)
    })
  }

  /**
   * Polls the Athena query execution state until completion
   * @param {string} QueryExecutionId - The ID of the query being executed
   * @returns {Observable<string>} Observable emitting QueryExecutionId on success
   */
  #checkQueryExecutionState(QueryExecutionId: string): Observable<string> {
    return defer(() =>
      from(
        this.#client.send(new GetQueryExecutionCommand({ QueryExecutionId })),
      ),
    ).pipe(
      switchMap((response) => {
        const state = response.QueryExecution?.Status?.State
        console.log(`Query execution state: ${state}`)

        switch (state) {
          case QueryExecutionState.SUCCEEDED:
            return of(QueryExecutionId)
          case QueryExecutionState.FAILED: {
            const errorMessage =
              response.QueryExecution?.Status?.StateChangeReason ||
              'Unknown reason'
            console.error('Query failed:', errorMessage)
            return throwError(() => new Error(`Query failed: ${errorMessage}`))
          }
          case QueryExecutionState.CANCELLED:
            return throwError(() => new Error('Query was cancelled'))
          case QueryExecutionState.QUEUED:
          case QueryExecutionState.RUNNING:
            return of(null) // Continue polling
          default:
            return throwError(() => new Error(`Unknown query state: ${state}`))
        }
      }),
      expand(
        (result) =>
          result === null
            ? timer(1000).pipe(
                switchMap(() =>
                  this.#checkQueryExecutionState(QueryExecutionId),
                ),
              )
            : EMPTY, // End recursion once the result is non-null
      ),
      filter((result) => result !== null),
      take(1),
    )
  }
}
