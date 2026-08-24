import { ESTIMATE_STATUSES, JOB_STATUSES, COMMISSION_STRUCTURES } from '../constants/enums.js';

export async function getLookups(supabase) {
  const [customers, users, installers, sources, types] = await Promise.all([
    supabase.from('Customer').select('id, name, createdAt, contacts:Contact(id, name, phone, email, customerId), addresses:Address(id, line, customerId)').order('name'),
    supabase.from('User').select('id, name, role').eq('active', true).order('name'),
    supabase.from('Installer').select('id, name').eq('active', true).order('name'),
    supabase.from('MarketingSource').select('id, name').eq('active', true).order('name'),
    supabase.from('EstimateType').select('id, name').eq('active', true).order('name')
  ]);

  const firstError = customers.error || users.error || installers.error || sources.error || types.error;
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
    statuses: ESTIMATE_STATUSES,
    jobStatuses: JOB_STATUSES,
    commissionStructures: COMMISSION_STRUCTURES
  };
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
  const { data, error } = await supabase.from(table).insert({ name }).select('id, name').single();
  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase.from(table).select('id, name').eq('name', name).maybeSingle();
      if (existing) return existing;
    }
    throw error;
  }
  return data;
}
