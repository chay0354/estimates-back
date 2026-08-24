import { conflict } from './httpError.js';

export function throwIf(error) {
  if (!error) return;
  if (error.code === '23505') {
    const field = /estimateNumber/i.test(error.message || '') ? 'estimateNumber' : undefined;
    throw conflict('Already exists', field);
  }
  const err = new Error(error.message || 'Database error');
  err.status = 500;
  err.code = error.code || 'DB_ERROR';
  throw err;
}

export function num(value) {
  return value == null ? null : Number(value);
}
