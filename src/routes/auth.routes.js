import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/auth.controller.js';

const r = Router();
r.post('/login', c.login);
r.get('/me', requireAuth, c.me);
export default r;
