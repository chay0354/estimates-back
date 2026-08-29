import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/lookup.controller.js';

const r = Router();
r.use(requireAuth);
r.get('/', c.getLookups);
r.get('/settings', c.getSettings);
r.post('/customers', c.createCustomer);
r.post('/marketing-sources', c.createMarketingSource);
r.post('/estimate-types', c.createEstimateType);
r.post('/installers', c.createInstaller);
r.post('/lists/:list', c.createListItem);
r.patch('/lists/:list/:id', c.patchListItem);
export default r;