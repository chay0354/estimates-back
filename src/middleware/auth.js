import { verifyAuth } from '@supabase/server/core';
import { unauthorized } from '../lib/httpError.js';
import { createUserClient, toFetchRequest } from '../lib/supabase.js';

export async function requireAuth(req, _res, next) {
  try {
    const { data, error } = await verifyAuth(toFetchRequest(req), { auth: 'user' });
    if (error) return next(unauthorized(error.message || 'Token invalid or expired'));

    const token = data.token;
    const supabase = createUserClient(token);
    const userId = data.userClaims?.id || data.jwtClaims?.sub;
    const { data: staff, error: staffError } = await supabase
      .from('User')
      .select('id, email, name, role, active')
      .eq('id', userId)
      .maybeSingle();

    if (staffError || !staff || staff.active === false) {
      return next(unauthorized('Token invalid or expired'));
    }

    req.supabase = supabase;
    req.user = { id: staff.id, email: staff.email, name: staff.name, role: staff.role };
    next();
  } catch {
    next(unauthorized('Token invalid or expired'));
  }
}
