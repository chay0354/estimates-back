import { createCustomerSchema, namedLookupSchema, updateNamedSchema } from '../validators/lookup.schema.js';
import * as lookupService from '../services/lookup.service.js';
import { forbidden } from '../lib/httpError.js';
import { SETTINGS_ROLES } from '../constants/enums.js';

function requireSettings(req) {
  if (!SETTINGS_ROLES.includes(req.user.role)) throw forbidden('Only a manager or admin can change settings lists');
}

export async function getLookups(req, res, next) {
  try {
    res.json(await lookupService.getLookups(req.supabase));
  } catch (e) { next(e); }
}

export async function getSettings(req, res, next) {
  try {
    res.json(await lookupService.listSettings(req.supabase));
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

export async function createListItem(req, res, next) {
  try {
    requireSettings(req);
    const { name } = namedLookupSchema.parse(req.body);
    const table = lookupService.tableForList(req.params.list);
    res.status(201).json(await lookupService.createNamed(req.supabase, table, name));
  } catch (e) { next(e); }
}

export async function patchListItem(req, res, next) {
  try {
    requireSettings(req);
    const data = updateNamedSchema.parse(req.body);
    res.json(await lookupService.updateNamed(req.supabase, req.params.list, req.params.id, data));
  } catch (e) { next(e); }
}
