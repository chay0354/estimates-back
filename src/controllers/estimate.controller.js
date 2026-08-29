import {
  createEstimateSchema, updateEstimateSchema, listQuerySchema,
  convertJobSchema, jobPatchSchema, expenseItemSchema, installerLaborSchema,
  repairLaborSchema, paymentItemSchema, techPaymentSchema, confirmDepositSchema
} from '../validators/estimate.schema.js';
import * as service from '../services/estimate.service.js';
import * as job from '../services/job.service.js';
import { notFound } from '../lib/httpError.js';

const ITEM_SCHEMAS = {
  expenses: expenseItemSchema,
  'installer-labor': installerLaborSchema,
  'repair-labor': repairLaborSchema,
  payments: paymentItemSchema,
  'tech-payments': techPaymentSchema
};

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

export async function convert(req, res, next) {
  try {
    const data = convertJobSchema.parse(req.body || {});
    res.status(201).json(await job.convertEstimate(req.supabase, req.params.id, data, req.user.id));
  } catch (e) { next(e); }
}

export async function getJob(req, res, next) {
  try {
    res.json(await job.getJob(req.supabase, req.params.id));
  } catch (e) { next(e); }
}

export async function patchJob(req, res, next) {
  try {
    const data = jobPatchSchema.parse(req.body);
    res.json(await job.updateJob(req.supabase, req.params.id, data, req.user));
  } catch (e) { next(e); }
}

export async function addItem(req, res, next) {
  try {
    const schema = ITEM_SCHEMAS[req.params.kind];
    if (!schema) return next(notFound('Unknown job section'));
    const data = schema.parse(req.body);
    const { job: saved } = await job.addItem(req.supabase, req.params.id, req.params.kind, data);
    res.status(201).json(saved);
  } catch (e) { next(e); }
}

export async function patchItem(req, res, next) {
  try {
    const schema = ITEM_SCHEMAS[req.params.kind];
    if (!schema) return next(notFound('Unknown job section'));
    const data = schema.parse(req.body);
    res.json(await job.updateItem(req.supabase, req.params.id, req.params.kind, req.params.itemId, data));
  } catch (e) { next(e); }
}

export async function removeItem(req, res, next) {
  try {
    res.json(await job.removeItem(req.supabase, req.params.id, req.params.kind, req.params.itemId));
  } catch (e) { next(e); }
}

export async function confirmPayment(req, res, next) {
  try {
    const data = confirmDepositSchema.parse(req.body);
    res.json(await job.confirmPayment(req.supabase, req.params.id, req.params.itemId, data, req.user));
  } catch (e) { next(e); }
}
