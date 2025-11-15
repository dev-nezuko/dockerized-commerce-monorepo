import type { NextFunction, Request, Response } from 'express';
import { ZodError, flattenError } from 'zod';

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}

export class AuthError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // A timed-out request has already been answered; let Express close the socket.
  if (res.headersSent) {
    next(err);
    return;
  }
  const traceId = req.id === undefined ? undefined : String(req.id);

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', details: flattenError(err), traceId });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.name, details: err.message, traceId });
    return;
  }

  // body-parser and other middleware attach a 4xx status to their errors.
  const reported = (err as { status?: unknown } | null)?.status;
  const status = typeof reported === 'number' && reported >= 400 && reported < 500 ? reported : 500;
  if (status >= 500) req.log?.error({ err }, 'unhandled error');
  res.status(status).json({
    error: status >= 500 ? 'InternalServerError' : 'BadRequest',
    details: status >= 500 ? 'Request could not be completed' : 'Invalid request',
    traceId,
  });
}
