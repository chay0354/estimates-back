import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/estimate.controller.js';

const r = Router();
r.use(requireAuth);
r.get('/', c.list);
r.post('/', c.create);
r.post('/:id/convert', c.convert);
r.get('/:id/job', c.getJob);
r.patch('/:id/job', c.patchJob);
r.post('/:id/job/payments/:itemId/confirm', c.confirmPayment);
r.post('/:id/job/:kind', c.addItem);
r.patch('/:id/job/:kind/:itemId', c.patchItem);
r.delete('/:id/job/:kind/:itemId', c.removeItem);
r.get('/:id', c.getOne);
r.patch('/:id', c.patch);
r.delete('/:id', c.remove);
export default r;
