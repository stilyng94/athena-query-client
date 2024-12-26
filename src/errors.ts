export class AthenaQueryError extends Error {
  constructor(
    message: string,
    public readonly queryExecutionId?: string,
  ) {
    super(message)
    this.name = 'AthenaQueryError'
  }
}
