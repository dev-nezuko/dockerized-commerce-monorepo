import type { NextFunction, Request, Response } from 'express';

export function requestTimeout(ms: number, retryAfterSec = 5) {
  return (req: Request, res: Response, next: NextFunction) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      if (!res.headersSent) {
        res.setHeader('Retry-After', String(retryAfterSec));
      }
      // Best-effort terminate request with 503
      res.status(503).json({ error: 'ServiceUnavailable', details: 'Request timed out' });
    }, ms);

    const clear = () => {
      if (!finished) {
        clearTimeout(timer);
        finished = true;
      }
    };

    res.on('finish', clear);
    res.on('close', clear);

    next();
  };
}
