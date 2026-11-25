/** Body of every API error. Mirrors `ApiErrorResponse` in apps/back. */
export interface ApiErrorBody {
  status: number;
  message: string;
  timestamp: string;
  path: string;
  details?: unknown;
}

/** Error thrown by every service call, simulated or real. Screens show `message`. */
export class ApiError extends Error implements ApiErrorBody {
  readonly status: number;
  readonly timestamp: string;
  readonly path: string;
  readonly details?: unknown;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.status;
    this.timestamp = body.timestamp;
    this.path = body.path;
    this.details = body.details;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/**
 * A 4xx: the server refused what the user sent (wrong number, wrong code, too soon).
 * Shown next to the field. Anything else (network, 5xx) is shown as a banner.
 */
export const isUserInputError = (error: unknown): error is ApiError =>
  isApiError(error) && error.status >= 400 && error.status < 500;
