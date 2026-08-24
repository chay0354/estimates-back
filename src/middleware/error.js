import { ZodError } from 'zod';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'No route ' + req.method + ' ' + req.path, code: 'NOT_FOUND' } });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(422).json({
      error: {
        message: first?.message || 'Validation failed',
        code: 'VALIDATION_FAILED',
        field: first?.path?.join('.'),
        issues: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      }
    });
  }
  if (err?.code === 'P2002' || err?.code === '23505') {
    return res.status(409).json({
      error: { message: 'Already exists', code: 'CONFLICT', field: err.field || err.meta?.target?.[0] }
    });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: { message: status >= 500 ? 'Server error' : err.message, code: err.code || 'ERROR', field: err.field }
  });
}
