import { createCustomerSchema, namedLookupSchema } from '../validators/lookup.schema.js';
import * as lookupService from '../services/lookup.service.js';

export async function getLookups(req, res, next) {
  try {
    res.json(await lookupService.getLookups(req.supabase));
  } catch (e) { next(e); }
}

export async function createCustomer(req, res, next) {
  try {
    const data = createCustomerSchema.parse(req.body);
    res.status(201).json(await lookupService.createCustomer(req.supabase, data));
  } catch (e) { next(e); }
}

export async function createMarketingSource(req, res, next) {
  try {
    const { name } = namedLookupSchema.parse(req.body);
    res.status(201).json(await lookupService.createNamed(req.supabase, 'MarketingSource', name));
  } catch (e) { next(e); }
}

export async function createEstimateType(req, res, next) {
  try {
    const { name } = namedLookupSchema.parse(req.body);
    res.status(201).json(await lookupService.createNamed(req.supabase, 'EstimateType', name));
  } catch (e) { next(e); }
}

export async function createInstaller(req, res, next) {
  try {
    const { name } = namedLookupSchema.parse(req.body);
    res.status(201).json(await lookupService.createNamed(req.supabase, 'Installer', name));
  } catch (e) { next(e); }
}