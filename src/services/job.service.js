import { conflict, forbidden, notFound } from '../lib/httpError.js';
import { num, throwIf } from '../lib/dbError.js';
import { WON_STATUS, ACCOUNTING_ROLES } from '../constants/enums.js';
import { getEstimate, replaceInstallers as setInstallers } from './estimate.service.js';

const KIND = {
  expenses: {
    table: 'JobExpense',
    map: (d) => ({
      expenseTypeId: d.expenseTypeId,
      vendorId: d.vendorId || null,
      amount: d.amount,
      purchasedDate: dateOnly(d.purchasedDate)
    })
  },
  'installer-labor': {
    table: 'JobInstallerLabor',
    map: (d) => ({
      expenseTypeId: d.expenseTypeId || null,
      vendorId: d.vendorId || null,
      installerId: d.installerId,
      paidToId: d.paidToId || null,
      crew: d.crew || null,
      amount: d.amount
    })
  },
  'repair-labor': {
    table: 'JobRepairLabor',
    map: (d) => ({
      expenseTypeId: d.expenseTypeId || null,
      vendorId: d.vendorId || null,
      technicianId: d.technicianId,
      amount: d.amount,
      workDate: dateOnly(d.workDate)
    })
  },
  payments: {
    table: 'JobPayment',
    map: (d) => ({
      paymentDate: dateOnly(d.paymentDate),
      methodId: d.methodId || null,
      madeBy: d.madeBy || 'Customer',
      rebateTypeId: d.rebateTypeId || null,
      reference: d.reference || null,
      notes: d.notes || null,
      amount: d.amount
    })
  },
  'tech-payments': {
    table: 'JobTechPayment',
    map: (d) => ({
      technicianId: d.technicianId || null,
      methodId: d.methodId || null,
      reference: d.reference || null,
      madeBy: d.madeBy || null,
      notes: d.notes || null,
      amount: d.amount,
      paidDate: dateOnly(d.paidDate || d.paymentDate)
    })
  }
};

function dateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export function jobTotals(job) {
  const expenses = (job.expenses || []).reduce((s, r) => s + money(r.amount), 0);
  const installerLabor = (job.installerLabor || []).reduce((s, r) => s + money(r.amount), 0);
  const repairLabor = (job.repairLabor || []).reduce((s, r) => s + money(r.amount), 0);
  const payments = (job.payments || []).reduce((s, r) => s + money(r.amount), 0);
  const confirmedPayments = (job.payments || []).filter((p) => p.confirmed).reduce((s, r) => s + money(r.amount), 0);
  const jobAmount = money(job.jobAmount ?? job.estimateAmount);
  const bonuses = money(job.techBonus) + money(job.membershipBonus) + money(job.googleStarBonus) + money(job.yelpStarBonus);
  const allCosts = money(expenses + installerLabor + repairLabor);
  const profit = jobAmount - allCosts;
  const commission = money(profit * (money(job.commissionPercent) / 100));
  const totalToTech = money(commission + bonuses);
  const companyAfterTech = money(profit - totalToTech);
  const advance = money(job.techAdvancePayment);
  const techOpenBalance = money(totalToTech - advance);
  const pct = (n) => (jobAmount ? Math.round((n / jobAmount) * 10000) / 100 : 0);
  return {
    totalExpenses: expenses,
    totalInstallerLabor: installerLabor,
    totalRepairTechLabor: repairLabor,
    totalPayments: payments,
    customerBalance: money(jobAmount - payments),
    confirmedPayments,
    unconfirmedPayments: (job.payments || []).filter((p) => !p.confirmed).length,
    depositCovered: jobAmount > 0 && payments + 0.001 >= jobAmount,
    jobAmount,
    allCosts,
    allCostsPct: pct(allCosts),
    profit,
    profitPct: pct(profit),
    techCommission: commission,
    techCommissionPct: pct(commission),
    advancePayment: advance,
    advancePct: pct(advance),
    totalToTech,
    totalToTechPct: pct(totalToTech),
    companyProfitAfterTech: companyAfterTech,
    companyProfitAfterTechPct: pct(companyAfterTech),
    techOpenBalance
  };
}

async function loadLines(supabase, estimateId) {
  const [expenses, installerLabor, repairLabor, payments, techPayments] = await Promise.all([
    supabase.from('JobExpense').select('*, expenseType:ExpenseType(id, name), vendor:Vendor(id, name)').eq('estimateId', estimateId).order('createdAt'),
    supabase.from('JobInstallerLabor').select('*, expenseType:ExpenseType(id, name), vendor:Vendor(id, name), installer:Installer!installerId(id, name), paidTo:Installer!paidToId(id, name)').eq('estimateId', estimateId).order('createdAt'),
    supabase.from('JobRepairLabor').select('*, expenseType:ExpenseType(id, name), vendor:Vendor(id, name), technician:Technician(id, name)').eq('estimateId', estimateId).order('createdAt'),
    supabase.from('JobPayment').select('*, method:PaymentMethod(id, name), rebateType:RebateType(id, name)').eq('estimateId', estimateId).order('createdAt'),
    supabase.from('JobTechPayment').select('*, technician:Technician(id, name), method:PaymentMethod(id, name)').eq('estimateId', estimateId).order('createdAt')
  ]);
  const first = expenses.error || installerLabor.error || repairLabor.error || payments.error || techPayments.error;
  throwIf(first);
  const n = (rows) => (rows || []).map((r) => ({ ...r, amount: num(r.amount) }));
  return {
    expenses: n(expenses.data),
    installerLabor: n(installerLabor.data),
    repairLabor: n(repairLabor.data),
    payments: n(payments.data),
    techPayments: n(techPayments.data)
  };
}

export async function getJob(supabase, id) {
  const estimate = await getEstimate(supabase, id);
  if (!estimate.converted) throw notFound('Estimate has not been converted to a job');
  const lines = await loadLines(supabase, id);
  const job = { ...estimate, ...lines };
  job.totals = jobTotals(job);
  return job;
}

export async function convertEstimate(supabase, id, data, actorId) {
  const estimate = await getEstimate(supabase, id);
  if (estimate.converted) throw conflict('Already converted to a job');
  const today = new Date().toISOString().slice(0, 10);
  const patch = {
    converted: true,
    status: WON_STATUS,
    jobStatus: 'Work In Progress',
    jobDate: dateOnly(data.jobDate) || today,
    jobAmount: data.jobAmount ?? estimate.estimateAmount,
    jobLink: data.jobLink || estimate.estimateLink,
    jobNumber: data.jobNumber || estimate.estimateNumber,
    serviceFusionId: data.serviceFusionId || null,
    updatedAt: new Date().toISOString()
  };
  const { error } = await supabase.from('Estimate').update(patch).eq('id', id);
  throwIf(error);
  if (data.installerIds) await setInstallers(supabase, id, data.installerIds);
  await supabase.from('EstimateEvent').insert({
    estimateId: id, field: 'converted', from: 'false', to: 'true', actorId
  });
  return getEstimate(supabase, id);
}

const JOB_PATCH_KEYS = [
  'jobNumber', 'jobLink', 'jobDate', 'jobAmount', 'jobStatus', 'serviceFusionId',
  'googleReview', 'yelpReview', 'fullRebate', 'mixedRebate', 'membershipSold', 'techAdvancePayment',
  'commissionPercent', 'techBonus', 'membershipBonus', 'googleStarBonus', 'yelpStarBonus',
  'adminApproved', 'awaitingDeposit'
];

function depositsCovered(job) {
  return Boolean(job.totals?.depositCovered);
}

async function maybePromoteToReadyToClose(supabase, id, actorId) {
  const job = await getJob(supabase, id);
  if (!job.awaitingDeposit) return job;
  if (job.jobStatus !== 'Work In Progress') return job;
  if (!depositsCovered(job)) return job;
  const { error } = await supabase.from('Estimate').update({
    jobStatus: 'Ready To Close',
    updatedAt: new Date().toISOString()
  }).eq('id', id);
  throwIf(error);
  await supabase.from('EstimateEvent').insert({
    estimateId: id, field: 'jobStatus', from: job.jobStatus, to: 'Ready To Close', actorId: actorId || null
  });
  return getJob(supabase, id);
}

export async function updateJob(supabase, id, data, user) {
  const before = await getJob(supabase, id);
  if (data.requestReadyToClose) {
    const patch = {
      awaitingDeposit: true,
      googleReview: data.googleReview ?? before.googleReview,
      yelpReview: data.yelpReview ?? before.yelpReview,
      fullRebate: data.fullRebate ?? before.fullRebate,
      mixedRebate: data.mixedRebate ?? before.mixedRebate,
      membershipSold: data.membershipSold ?? before.membershipSold,
      updatedAt: new Date().toISOString()
    };
    if (depositsCovered(before)) patch.jobStatus = 'Ready To Close';
    const { error } = await supabase.from('Estimate').update(patch).eq('id', id);
    throwIf(error);
    if (patch.jobStatus && patch.jobStatus !== before.jobStatus) {
      await supabase.from('EstimateEvent').insert({
        estimateId: id, field: 'jobStatus', from: before.jobStatus, to: patch.jobStatus, actorId: user.id
      });
    }
    return getJob(supabase, id);
  }
  if (data.jobStatus && data.jobStatus !== before.jobStatus) {
    if (data.jobStatus === 'Ready To Close') {
      if (!before.awaitingDeposit) {
        throw forbidden('Send the job to Confirm Deposit first');
      }
      if (!depositsCovered(before)) {
        throw forbidden('Deposits must equal the job amount before Ready to Close');
      }
    }
    if (['Admin Approval', 'Ready To Pay', 'Closed'].includes(data.jobStatus) && !['ADMIN', 'MANAGER'].includes(user.role)) {
      throw forbidden('Only a manager or admin can approve and close a job');
    }
  }
  const patch = { updatedAt: new Date().toISOString() };
  for (const key of JOB_PATCH_KEYS) {
    if (key in data) patch[key] = key.toLowerCase().includes('date') ? dateOnly(data[key]) ?? data[key] : data[key];
  }
  if (data.jobDate) patch.jobDate = dateOnly(data.jobDate);
  const { error } = await supabase.from('Estimate').update(patch).eq('id', id);
  throwIf(error);
  if (data.installerIds) await setInstallers(supabase, id, data.installerIds);
  if (data.jobStatus && data.jobStatus !== before.jobStatus) {
    await supabase.from('EstimateEvent').insert({
      estimateId: id, field: 'jobStatus', from: before.jobStatus, to: data.jobStatus, actorId: user.id
    });
  }
  return getJob(supabase, id);
}

export async function addItem(supabase, id, kind, data) {
  await getJob(supabase, id);
  const spec = KIND[kind];
  if (!spec) throw notFound('Unknown job section');
  const { data: row, error } = await supabase.from(spec.table).insert({ estimateId: id, ...spec.map(data) }).select('id').single();
  throwIf(error);
  const job = kind === 'payments' ? await maybePromoteToReadyToClose(supabase, id) : await getJob(supabase, id);
  return { job, id: row.id };
}

export async function updateItem(supabase, id, kind, itemId, data) {
  await getJob(supabase, id);
  const spec = KIND[kind];
  if (!spec) throw notFound('Unknown job section');
  const { error } = await supabase.from(spec.table).update(spec.map(data)).eq('id', itemId).eq('estimateId', id);
  throwIf(error);
  return kind === 'payments' ? maybePromoteToReadyToClose(supabase, id) : getJob(supabase, id);
}

export async function removeItem(supabase, id, kind, itemId) {
  await getJob(supabase, id);
  const spec = KIND[kind];
  if (!spec) throw notFound('Unknown job section');
  const { error } = await supabase.from(spec.table).delete().eq('id', itemId).eq('estimateId', id);
  throwIf(error);
  return kind === 'payments' ? maybePromoteToReadyToClose(supabase, id) : getJob(supabase, id);
}

export async function confirmPayment(supabase, id, itemId, data, user) {
  if (!ACCOUNTING_ROLES.includes(user.role)) {
    throw forbidden('Only accounting can confirm a deposit');
  }
  await getJob(supabase, id);
  const patch = {
    confirmed: data.confirmed,
    depositDate: data.confirmed ? (dateOnly(data.depositDate) || new Date().toISOString().slice(0, 10)) : null,
    confirmedById: data.confirmed ? user.id : null
  };
  const { error } = await supabase.from('JobPayment').update(patch).eq('id', itemId).eq('estimateId', id);
  throwIf(error);
  return getJob(supabase, id);
}
