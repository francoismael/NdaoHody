import { ArgumentsHost, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ApiErrorResponse } from '../../application/dto/api-error.response';
import { ApiExceptionFilter, INTERNAL_ERROR_MESSAGE } from './api-exception.filter';

interface CapturedResponse {
  status: number;
  body: ApiErrorResponse;
}

function run(exception: unknown): CapturedResponse {
  const captured = {} as CapturedResponse;
  const response = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: ApiErrorResponse) {
      captured.body = body;
    },
  };
  const host = {
    switchToHttp: () => ({ getRequest: () => ({ url: '/api/v1/test' }), getResponse: () => response }),
  } as unknown as ArgumentsHost;

  new ApiExceptionFilter().catch(exception, host);
  return captured;
}

describe('ApiExceptionFilter', () => {
  it('keeps the status and message of an HTTP exception', () => {
    const { status, body } = run(new NotFoundException('Trajet introuvable'));
    expect(status).toBe(404);
    expect(body).toMatchObject({ status: 404, message: 'Trajet introuvable', path: '/api/v1/test' });
    expect(typeof body.timestamp).toBe('string');
  });

  it('joins validation messages into one message', () => {
    const { body } = run(new BadRequestException(['telephone is required', 'places must be a number']));
    expect(body.message).toBe('telephone is required, places must be a number');
  });

  it('keeps the details of an exception', () => {
    const details = { postgres: 'ok', mongodb: 'error' };
    const { body } = run(new ServiceUnavailableException({ message: 'A database is not responding.', details }));
    expect(body).toMatchObject({ status: 503, message: 'A database is not responding.', details });
  });

  it('hides unexpected errors behind a generic message', () => {
    const { status, body } = run(new Error('connection refused at 10.0.0.1'));
    expect(status).toBe(500);
    expect(body.message).toBe(INTERNAL_ERROR_MESSAGE);
  });
});
