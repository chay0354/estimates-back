import { loginSchema } from '../validators/auth.schema.js';
import * as authService from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    res.json(await authService.login(body));
  } catch (e) { next(e); }
}

export async function me(req, res) {
  res.json({ user: req.user });
}
