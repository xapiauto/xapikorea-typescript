export class XAPIKoreaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "XAPIKoreaError";
  }
}

export interface APIErrorDetails {
  status: number;
  body: unknown;
  retryAfter: number | null;
}

export class APIError extends XAPIKoreaError {
  readonly status: number;
  readonly body: unknown;
  /** Seconds to wait before retrying, from the Retry-After header. */
  readonly retryAfter: number | null;

  constructor(message: string, details: APIErrorDetails) {
    super(message);
    this.name = "APIError";
    this.status = details.status;
    this.body = details.body;
    this.retryAfter = details.retryAfter;
  }
}
