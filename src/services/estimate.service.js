import { notFound } from '../lib/httpError.js';
import { num, throwIf } from '../lib/dbError.js';
import { ESTIMATE_STATUSES, WON_STATUS, OPEN_STATUSES, FOLLOW_UP_STATUSES } from '../constants/enums.js';

const ESTIMATE_SELECT = `
  *,
  customer:Customer!customerId(id, name),
  contact:Contact!contactId(id, name),
  address:Address!addressId(id, line),
  assignedUser:User!assignedUserId(id, name),
  marketingSource:MarketingSource!marketingSourceId(id, name),
  estimateType:EstimateType!estimateTypeId(id, name),
  EstimateInstaller(installer:Installer!installerId(id, name))
`;

function shapeEstimate(row) {
  if (!row) return row;
  const { EstimateInstaller, ...rest } = row;
  return {
    ...rest,
    estimateAmount: num(rest.estimateAmount),
    jobAmount: num(rest.jobAmount),
    techAdvancePayment: num(rest.techAdvancePayment) || 0,
    commissionPercent: num(rest.commissionPercent) || 0,
    techBonus: num(rest.techBonus) || 0,
    membershipBonus: num(rest.membershipBonus) || 0,
    googleStarBonus: num(rest.googleStarBonus) || 0,
    yelpStarBonus: num(rest.yelpStarBonus) || 0,
    installers: (EstimateInstaller || []).map((j) => j.installer).filter(Boolean)
  };
}

function rangeStart(range) {
  if (range === 'all') return null;
  const d = new Date();
  if (range === '7d') d.setDate(d.getDate() - 7);
  if (range === '30d') d.setDate(d.getDate() - 30);
  if (range === 'quarter') d.setMonth(d.getMonth() - 3);
  return d;
}

function matchesSearch(row, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [row.estimateNumber, row.customer?.name, row.contact?.name]
    .some((v) => String(v || '').toLowerCase().includes(needle));
}

function applyFilters(query, f) {
  query = query.is('deletedAt', null);
  const from = rangeStart(f.range);
  if (from) query = query.gte('estimateDate', from.toISOString());
  if (f.status !== 'all') query = query.eq('status', f.status);
  if (f.assignedUserId !== 'all') query = query.eq('assignedUserId', f.assignedUserId);
  if (f.estimateTypeId !== 'all') query = query.eq('estimateTypeId', f.estimateTypeId);
  if (f.commissionStructure !== 'all') query = query.eq('commissionStructure', f.commissionStructure);
  if (f.converted !== 'any') query = query.eq('converted', f.converted === 'yes');
  if (f.minAmount != null) query = query.gte('estimateAmount', f.minAmount);
  if (f.maxAmount != null) query = query.lte('estimateAmount', f.maxAmount);
  return query;
}

function buildSummary(rows) {
  const total = rows.length;
  const totalValue = rows.reduce((s, r) => s + num(r.estimateAmount), 0);
  const won = rows.filter((r) => r.status === WON_STATUS);
  const open = rows.filter((r) => OPEN_STATUSES.includes(r.status));
  const followUp = rows.filter((r) => FOLLOW_UP_STATUSES.includes(r.status));
  const counts = Object.fromEntries(ESTIMATE_STATUSES.map((s) => [s, 0]));
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
  return {
    total,
    totalValue,
    openPipeline: open.reduce((s, r) => s + num(r.estimateAmount), 0),
    openCount: open.length,
    wonValue: won.reduce((s, r) => s + num(r.estimateAmount), 0),
    wonCount: won.length,
    conversionRate: total ? Math.round((won.length / total) * 100) : 0,
    needsFollowUp: followUp.length,
    distribution: ESTIMATE_STATUSES.map((s) => ({ status: s, count: counts[s] || 0 })).filter((d) => d.count > 0)
  };
}

export async function listEstimates(supabase, filters) {
  let query = applyFilters(supabase.from('Estimate').select(ESTIMATE_SELECT), filters);
  const { data, error } = await query.order(filters.sortKey, { ascending: filters.sortDir === 'asc' });
  throwIf(error);
  const matched = (data || []).map(shapeEstimate).filter((row) => matchesSearch(row, filters.q));
  const withPayments = await attachUnconfirmed(supabase, matched);
  const start = (filters.page - 1) * filters.pageSize;
  return {
    rows: withPayments.slice(start, start + filters.pageSize),
    summary: buildSummary(withPayments),
    page: filters.page,
    pageSize: filters.pageSize
  };
}

async function attachUnconfirmed(supabase, rows) {
  const ids = rows.filter((r) => r.converted).map((r) => r.id);
  if (!ids.length) return rows.map((r) => ({ ...r, unconfirmedPayments: 0 }));
  const { data: pays, error } = await supabase.from('JobPayment').select('estimateId, confirmed').in('estimateId', ids);
  throwIf(error);
  const pending = {};
  for (const p of pays || []) {
    if (!p.confirmed) pending[p.estimateId] = (pending[p.estimateId] || 0) + 1;
  }
  return rows.map((r) => ({ ...r, unconfirmedPayments: pending[r.id] || 0 }));
}

export async function getEstimate(supabase, id) {
  const { data, error } = await supabase
    .from('Estimate')
    .select(ESTIMATE_SELECT + ', events:EstimateEvent(*)')
    .eq('id', id)
    .is('deletedAt', null)
    .maybeSingle();
  throwIf(error);
  if (!data) throw notFound('Estimate not found');
  const estimate = shapeEstimate(data);
  estimate.events = (data.events || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
  return estimate;
}

function jobFields(data) {
  if (data.converted !== true) {
    return { jobStatus: null, jobLink: null, jobDate: null, jobAmount: null, installerIds: [] };
  }
  return {
    jobStatus: data.jobStatus ?? null,
    jobLink: data.jobLink ?? null,
    jobDate: data.jobDate ?? null,
    jobAmount: data.jobAmount ?? null,
    installerIds: data.installerIds || []
  };
}

export async function replaceInstallers(supabase, estimateId, installerIds) {
  const { error: delError } = await supabase.from('EstimateInstaller').delete().eq('estimateId', estimateId);
  throwIf(delError);
  if (!installerIds?.length) return;
  const { error } = await supabase.from('EstimateInstaller').insert(
    installerIds.map((installerId) => ({ estimateId, installerId }))
  );
  throwIf(error);
}

export async function createEstimate(supabase, data, actorId) {
  const job = jobFields(data);
  const { data: created, error } = await supabase
    .from('Estimate')
    .insert({
      estimateNumber: data.estimateNumber,
      estimateLink: data.estimateLink,
      estimateDate: data.estimateDate,
      estimateAmount: data.estimateAmount,
      phone: data.phone,
      email: data.email || null,
      customerId: data.customerId,
      contactId: data.contactId,
      addressId: data.addressId,
      marketingSourceId: data.marketingSourceId,
      estimateTypeId: data.estimateTypeId,
      assignedUserId: data.assignedUserId,
      commissionStructure: data.commissionStructure,
      status: data.status,
      converted: data.converted,
      jobStatus: job.jobStatus,
      jobLink: job.jobLink,
      jobDate: job.jobDate,
      jobAmount: job.jobAmount
    })
    .select('id')
    .single();
  throwIf(error);
  await replaceInstallers(supabase, created.id, job.installerIds);
  const { error: eventError } = await supabase.from('EstimateEvent').insert({
    estimateId: created.id,
    field: 'created',
    to: data.status,
    actorId
  });
  throwIf(eventError);
  return getEstimate(supabase, created.id);
}

export async function updateEstimate(supabase, id, data, actorId) {
  const before = await getEstimate(supabase, id);
  const patch = { ...data, updatedAt: new Date().toISOString() };
  delete patch.installerIds;
  if ('converted' in data) Object.assign(patch, jobFields({ ...before, ...data }));
  const installerIds = 'converted' in data ? jobFields({ ...before, ...data }).installerIds : data.installerIds;
  delete patch.installerIds;

  const { error } = await supabase.from('Estimate').update(patch).eq('id', id);
  throwIf(error);
  if (installerIds) await replaceInstallers(supabase, id, installerIds);

  const events = [];
  if (data.status && data.status !== before.status) events.push({ field: 'status', from: before.status, to: data.status });
  if (data.converted != null && data.converted !== before.converted) {
    events.push({ field: 'converted', from: String(before.converted), to: String(data.converted) });
  }
  if (data.jobStatus && data.jobStatus !== before.jobStatus) {
    events.push({ field: 'jobStatus', from: before.jobStatus, to: data.jobStatus });
  }
  if (events.length) {
    const { error: eventError } = await supabase.from('EstimateEvent').insert(
      events.map((e) => ({ ...e, estimateId: id, actorId }))
    );
    throwIf(eventError);
  }
  return getEstimate(supabase, id);
}

export async function softDeleteEstimate(supabase, id) {
  await getEstimate(supabase, id);
  const { error } = await supabase.from('Estimate').update({ deletedAt: new Date().toISOString() }).eq('id', id);
  throwIf(error);
  return { ok: true };
}
