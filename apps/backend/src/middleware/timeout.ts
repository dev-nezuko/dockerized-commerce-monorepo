import type { NextFunction, Request, Response } from 'express';

/**
 * Answers with 503 when a handler is still running after `ms`. The handler is
 * not cancelled; its late response is discarded by the error handler.
 */
export function requestTimeout(ms: number, retryAfterSec = 5) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (res.headersSent) return;
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(503).json({ error: 'ServiceUnavailable', details: 'Request timed out' });
    }, ms);
    const clear = () => clearTimeout(timer);
    res.on('finish', clear);
    res.on('close', clear);
    next();
  };
}
