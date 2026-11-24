import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorResponse } from '../../application/dto/api-error.response';

/** Shown to the user when an unexpected error happens (details stay in the server logs). */
export const INTERNAL_ERROR_MESSAGE = 'Une erreur est survenue. Réessaie dans un instant.';

interface ErrorDescription {
  status: number;
  message: string;
  details?: unknown;
}

/**
 * Turns every exception into the same JSON shape: { status, message, timestamp, path, details? }.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { status, message, details } = this.describe(exception);

    const body: ApiErrorResponse = {
      status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details === undefined ? {} : { details }),
    };
    response.status(status).json(body);
  }

  private describe(exception: unknown): ErrorDescription {
    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), ...readHttpResponse(exception.getResponse(), exception.message) };
    }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: INTERNAL_ERROR_MESSAGE };
  }
}

/** Reads the message (and optional details) Nest puts in an HttpException response. */
function readHttpResponse(response: string | object, fallback: string): Omit<ErrorDescription, 'status'> {
  if (typeof response === 'string') {
    return { message: response };
  }
  const { message, details } = response as { message?: unknown; details?: unknown };
  if (Array.isArray(message)) {
    return { message: message.join(', '), details };
  }
  return { message: typeof message === 'string' ? message : fallback, details };
}
