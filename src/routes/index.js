import { Router } from 'express';
import authRoutes from './auth.routes.js';
import estimateRoutes from './estimate.routes.js';
import lookupRoutes from './lookup.routes.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ ok: true }));
router.use('/auth', authRoutes);
router.use('/estimates', estimateRoutes);
router.use('/lookups', lookupRoutes);
export default router;
