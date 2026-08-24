export class HttpError extends Error {
  constructor(status, message, code, field) {
    super(message);
    this.status = status;
    this.code = code ?? 'ERROR';
    this.field = field;
  }
}

export const badRequest = (m, f) => new HttpError(400, m, 'BAD_REQUEST', f);
export const unauthorized = (m = 'Not signed in') => new HttpError(401, m, 'UNAUTHORIZED');
export const notFound = (m = 'Not found') => new HttpError(404, m, 'NOT_FOUND');
export const conflict = (m, f) => new HttpError(409, m, 'CONFLICT', f);
export const unprocessable = (m, f) => new HttpError(422, m, 'VALIDATION_FAILED', f);
