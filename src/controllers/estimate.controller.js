import { createEstimateSchema, updateEstimateSchema, listQuerySchema } from '../validators/estimate.schema.js';
import * as service from '../services/estimate.service.js';

export async function list(req, res, next) {
  try {
    const filters = listQuerySchema.parse(req.query);
    res.json(await service.listEstimates(req.supabase, filters));
  } catch (e) { next(e); }
}

export async function getOne(req, res, next) {
  try {
    res.json(await service.getEstimate(req.supabase, req.params.id));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const data = createEstimateSchema.parse(req.body);
    const estimate = await service.createEstimate(req.supabase, data, req.user.id);
    res.status(201).json(estimate);
  } catch (e) { next(e); }
}

export async function patch(req, res, next) {
  try {
    const data = updateEstimateSchema.parse(req.body);
    res.json(await service.updateEstimate(req.supabase, req.params.id, data, req.user.id));
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    res.json(await service.softDeleteEstimate(req.supabase, req.params.id));
  } catch (e) { next(e); }
}
