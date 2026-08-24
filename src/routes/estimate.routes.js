import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/estimate.controller.js';

const r = Router();
r.use(requireAuth);
r.get('/', c.list);
r.post('/', c.create);
r.get('/:id', c.getOne);
r.patch('/:id', c.patch);
r.delete('/:id', c.remove);
export default r;
