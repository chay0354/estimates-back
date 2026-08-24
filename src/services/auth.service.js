import { createAnonClient, createUserClient } from '../lib/supabase.js';
import { unauthorized } from '../lib/httpError.js';

// Temporary staff login. Supabase Auth rejects role-style addresses like
// admin@gmail.com on signup, so the app accepts these credentials and
// exchanges them for the existing staff Auth user.
const STAFF_LOGIN = {
  email: 'admin@gmail.com',
  password: '12345678',
  authEmail: 'dana@example.com',
  authPassword: 'password123'
};

export async function login({ email, password }) {
  const incoming = email.toLowerCase().trim();
  const isStaffLogin = incoming === STAFF_LOGIN.email && password === STAFF_LOGIN.password;
  const authEmail = isStaffLogin ? STAFF_LOGIN.authEmail : incoming;
  const authPassword = isStaffLogin ? STAFF_LOGIN.authPassword : password;

  const authClient = createAnonClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email: authEmail,
    password: authPassword
  });
  if (error || !data.session?.access_token || !data.user?.id) {
    throw unauthorized('Email or password is incorrect');
  }

  const supabase = createUserClient(data.session.access_token);
  const { data: staff } = await supabase
    .from('User')
    .select('id, email, name, role, active')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!staff || staff.active === false) throw unauthorized('Email or password is incorrect');

  return {
    token: data.session.access_token,
    user: { id: staff.id, email: staff.email, name: staff.name, role: staff.role }
  };
}
