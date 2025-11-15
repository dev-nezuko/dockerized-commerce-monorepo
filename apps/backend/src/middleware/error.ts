import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

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
  const traceId = (req as any).id as string | undefined;

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', details: err.flatten(), traceId });
    return;
  }

  if (err instanceof NotFoundError || err instanceof AuthError) {
    const status = (err as any).status ?? 500;
    res.status(status).json({ error: err.name, details: err.message, traceId });
    return;
  }

  const anyErr = err as any;
  const status = typeof anyErr?.status === 'number' ? anyErr.status : 500;
  const message = status >= 500 ? 'Request could not be completed' : 'Invalid request';
  res.status(status).json({ error: 'InternalServerError', details: message, traceId });
}
