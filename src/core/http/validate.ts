import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

declare module 'express-serve-static-core' {
  interface Request {
    // Express 5's req.query is a getter with no setter that recomputes fresh from the raw URL on
    // every access (no caching) — assigning to it throws, and mutating the returned object is a
    // silent no-op since the next read discards it. Validated/coerced query data lives here
    // instead; controllers that validate a query schema must read from here, not req.query.
    validatedQuery?: Record<string, unknown>;
    validatedParams?: Record<string, unknown>;
  }
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query) as Record<string, unknown>;
      }
      if (schemas.params) {
        req.validatedParams = schemas.params.parse(req.params) as Record<string, unknown>;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
