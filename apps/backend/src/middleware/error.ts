import type { NextFunction, Request, Response } from 'express';
import { ZodError, flattenError } from 'zod';

export class NotFoundError extends Error {
  status = 404 as const;
  constructor(message = 'Not Found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthError extends Error {
  status = 401 as const;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const traceId = req.id === undefined ? undefined : String(req.id);

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', details: flattenError(err), traceId });
    return;
  }

  if (err instanceof NotFoundError || err instanceof AuthError) {
    res.status(err.status).json({ error: err.name, details: err.message, traceId });
    return;
  }

  const reported = (err as { status?: unknown } | null)?.status;
  const status = typeof reported === 'number' ? reported : 500;
  const message = status >= 500 ? 'Request could not be completed' : 'Invalid request';
  res.status(status).json({ error: 'InternalServerError', details: message, traceId });
}
