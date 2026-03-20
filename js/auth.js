// auth.js — Login, Signup, Logout, Session Management

async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signUp(email, password, name, role) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    await sb.from('profiles').insert({ id: data.user.id, name, role });
  }
  return data;
}

async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  return data;
}
