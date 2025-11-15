import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

export type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse((req as any)[part]);
      (req as any)[part] = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}
