import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

/** Turns thrown errors into JSON responses. Mount after all routes. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'invalid_input', issues: err.issues });
    return;
  }
  // express.json() parse errors
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }
  // Postgres: 23514 = a CHECK constraint failed, 23502 = NOT NULL violated
  if (err?.code === '23514' || err?.code === '23502') {
    res.status(400).json({ error: 'invalid_input', detail: err.constraint ?? err.column });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
};
