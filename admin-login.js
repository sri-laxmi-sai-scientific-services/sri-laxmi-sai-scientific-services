(() => {
  'use strict';
  const ADMIN_EMAIL = 'saiscientific.dhaara@gmail.com';
  const form = document.getElementById('loginForm');
  const status = document.getElementById('loginStatus');
  const button = document.getElementById('loginButton');

  function say(message, isError = true) {
    status.textContent = message;
    status.style.color = isError ? '#b42318' : '#067647';
  }

  const cfg = window.SLS_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    say('Admin sign-in is not configured. Please verify config.js has the exact Supabase Project URL and browser-safe publishable key.');
    button.disabled = true;
    return;
  }

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const password = document.getElementById('adminPassword').value;
    if (email !== ADMIN_EMAIL) {
      say('This email is not on the administrator allowlist.');
      return;
    }
    button.disabled = true;
    button.textContent = 'Signing in…';
    say('Connecting to Supabase…', false);
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const signedInEmail = (data.user?.email || '').toLowerCase();
      if (signedInEmail !== ADMIN_EMAIL) {
        await client.auth.signOut();
        throw new Error('This account is not an authorized administrator.');
      }
      say('Login successful. Opening your dashboard…', false);
      window.location.href = 'admin-dashboard.html';
    } catch (error) {
      const message = error?.message || 'Login failed.';
      if (/failed to fetch/i.test(message)) {
        say('Could not reach Supabase. Check the exact Project URL in config.js and your internet connection. Do not use a dashboard URL or secret key.');
      } else {
        say(`Login failed: ${message}`);
      }
    } finally {
      button.disabled = false;
      button.textContent = 'Login to Admin';
    }
  });
})();
