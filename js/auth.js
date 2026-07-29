// Google OAuth login/logout + session guard. Requires js/supabase.js loaded first.

async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) console.error('Google login failed:', error.message);
}

async function logout() {
  await supabase.auth.signOut();
  location.hash = '#/login';
}

// Resolves the current session (or null), waiting for Supabase to finish
// parsing any OAuth redirect tokens from the URL first.
async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Redirects to #/login if there's no session; returns the session otherwise.
async function requireSession() {
  const session = await getSession();
  if (!session) {
    location.hash = '#/login';
    return null;
  }
  return session;
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session && location.hash === '#/login') {
    location.hash = '#/dashboard';
  }
});
