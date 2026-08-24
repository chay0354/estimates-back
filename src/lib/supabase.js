import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error('Missing ' + name);
  return value;
}

export function createAnonClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function createUserClient(accessToken) {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: 'Bearer ' + accessToken } }
  });
}

export function toFetchRequest(req) {
  const headers = new Headers();
  if (req.headers.authorization) headers.set('Authorization', req.headers.authorization);
  if (req.headers.apikey) headers.set('apikey', req.headers.apikey);
  return new Request((process.env.SUPABASE_URL || 'http://localhost') + (req.originalUrl || '/'), {
    method: req.method || 'GET',
    headers
  });
}
