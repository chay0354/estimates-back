import { ESTIMATE_STATUSES, JOB_STATUSES, COMMISSION_STRUCTURES, PAYMENT_MADE_BY, CREWS } from '../constants/enums.js';
import { notFound } from '../lib/httpError.js';

export const LIST_TABLES = {
  'marketing-sources': 'MarketingSource',
  'estimate-types': 'EstimateType',
  installers: 'Installer',
  technicians: 'Technician',
  'expense-types': 'ExpenseType',
  vendors: 'Vendor',
  'payment-methods': 'PaymentMethod',
  'repair-categories': 'RepairCategory',
  'rebate-types': 'RebateType'
};

export async function getLookups(supabase) {
  const named = (table) => supabase.from(table).select('id, name, active').eq('active', true).order('name');
  const [customers, users, installers, sources, types, technicians, expenseTypes, vendors, paymentMethods, repairCategories, rebateTypes] = await Promise.all([
    supabase.from('Customer').select('id, name, createdAt, contacts:Contact(id, name, phone, email, customerId), addresses:Address(id, line, customerId)').order('name'),
    supabase.from('User').select('id, name, role').eq('active', true).order('name'),
    named('Installer'),
    named('MarketingSource'),
    named('EstimateType'),
    named('Technician'),
    named('ExpenseType'),
    named('Vendor'),
    named('PaymentMethod'),
    named('RepairCategory'),
    named('RebateType')
  ]);

  const firstError = customers.error || users.error || installers.error || sources.error || types.error
    || technicians.error || expenseTypes.error || vendors.error || paymentMethods.error
    || repairCategories.error || rebateTypes.error;
  if (firstError) throw firstError;

  return {
    customers: (customers.data || []).map((c) => ({
      ...c,
      contacts: (c.contacts || []).sort((a, b) => a.name.localeCompare(b.name)),
      addresses: (c.addresses || []).sort((a, b) => a.line.localeCompare(b.line))
    })),
    users: users.data || [],
    installers: installers.data || [],
    marketingSources: sources.data || [],
    estimateTypes: types.data || [],
    technicians: technicians.data || [],
    expenseTypes: expenseTypes.data || [],
    vendors: vendors.data || [],
    paymentMethods: paymentMethods.data || [],
    repairCategories: repairCategories.data || [],
    rebateTypes: rebateTypes.data || [],
    statuses: ESTIMATE_STATUSES,
    jobStatuses: JOB_STATUSES,
    commissionStructures: COMMISSION_STRUCTURES,
    paymentMadeBy: PAYMENT_MADE_BY,
    crews: CREWS
  };
}

export async function listSettings(supabase) {
  const load = (table) => supabase.from(table).select('id, name, active').order('name');
  const results = {};
  for (const [key, table] of Object.entries(LIST_TABLES)) {
    const { data, error } = await load(table);
    if (error) throw error;
    results[key] = data || [];
  }
  return results;
}

export async function createCustomer(supabase, data) {
  const { data: customer, error } = await supabase
    .from('Customer')
    .insert({ name: data.name })
    .select('id, name')
    .single();
  if (error) throw error;

  const [{ data: contact, error: contactError }, { data: address, error: addressError }] = await Promise.all([
    supabase.from('Contact').insert({
      name: data.contactName,
      phone: data.phone,
      email: data.email || null,
      customerId: customer.id
    }).select('id, name, phone, email, customerId').single(),
    supabase.from('Address').insert({
      line: data.address,
      customerId: customer.id
    }).select('id, line, customerId').single()
  ]);
  if (contactError) throw contactError;
  if (addressError) throw addressError;

  return { ...customer, contacts: [contact], addresses: [address] };
}

export async function createNamed(supabase, table, name) {
  const { data, error } = await supabase.from(table).insert({ name }).select('id, name, active').single();
  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase.from(table).select('id, name, active').eq('name', name).maybeSingle();
      if (existing) return existing;
    }
    throw error;
  }
  return data;
}

export function tableForList(list) {
  const table = LIST_TABLES[list];
  if (!table) throw notFound('Unknown settings list');
  return table;
}

export async function updateNamed(supabase, list, id, data) {
  const table = tableForList(list);
  const patch = {};
  if (data.name != null) patch.name = data.name;
  if (data.active != null) patch.active = data.active;
  const { data: row, error } = await supabase.from(table).update(patch).eq('id', id).select('id, name, active').single();
  if (error) throw error;
  return row;
}
