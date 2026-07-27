export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  /** Operational errors are expected/handled cases (bad input, not found, etc.);
   *  non-operational errors are bugs/infra failures and get logged at higher severity. */
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
