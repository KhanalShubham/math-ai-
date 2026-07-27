import type { Request, Response } from 'express';
import { errorHandlerMiddleware } from '../../src/middleware/error-handler.middleware';
import { NotFoundError, InternalError } from '../../src/errors';

function mockResponse() {
  const status = jest.fn();
  const json = jest.fn();
  status.mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

describe('errorHandlerMiddleware', () => {
  it('maps an operational AppError to its declared status code and code', () => {
    const { res, status, json } = mockResponse();
    const err = new NotFoundError('Student not found');

    errorHandlerMiddleware(err, {} as Request, res, jest.fn());

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Student not found', details: undefined },
    });
  });

  it('maps a non-operational AppError to its status code without leaking internals differently', () => {
    const { res, status } = mockResponse();
    const err = new InternalError('Unexpected failure');

    errorHandlerMiddleware(err, {} as Request, res, jest.fn());

    expect(status).toHaveBeenCalledWith(500);
  });

  it('maps an unknown thrown value to a generic 500 response', () => {
    const { res, status, json } = mockResponse();

    errorHandlerMiddleware(new Error('boom'), {} as Request, res, jest.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
});
