(() => {
  'use strict';
  const ADMIN_EMAIL = 'saiscientific.dhaara@gmail.com';
  const cfg = window.SLS_CONFIG || {};
  const body = document.getElementById('requestRows');
  const count = document.getElementById('requestCount');
  const message = document.getElementById('statusMessage');
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (s, ok = false) => { message.textContent = s || ''; message.style.color = ok ? '#067647' : '#b42318'; };

  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    body.innerHTML = '<tr><td colspan="12" class="empty-state">Supabase is not configured. Check config.js.</td></tr>';
    count.textContent = 'Unable to load requests.';
    return;
  }
  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  let allRequests = [];

  async function checkSession() {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session || (data.session.user?.email || '').toLowerCase() !== ADMIN_EMAIL) {
      await client.auth.signOut();
      window.location.replace('admin.html');
      return false;
    }
    document.getElementById('signedInAs').textContent = `Signed in as ${data.session.user.email}`;
    return true;
  }

  function dateText(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', {dateStyle:'medium',timeStyle:'short'});
  }

  async function loadRequests() {
    say('');
    body.innerHTML = '<tr><td colspan="12" class="empty-state">Loading customer requests…</td></tr>';
    const { data, error } = await client.from('enquiries').select('id,created_at,type,name,company,phone,email,subject,location,instrument,message,attachment_path,status').order('created_at', {ascending:false}).limit(500);
    if (error) {
      body.innerHTML = '<tr><td colspan="12" class="empty-state">Could not load requests. Confirm the admin RLS policies were applied in Supabase.</td></tr>';
      count.textContent = 'Request loading failed.';
      say(`Database error: ${error.message}`);
      return;
    }
    allRequests = data || [];
    renderRequests();
  }

  function matchingRequests() {
    const term = searchInput.value.trim().toLowerCase();
    const typ = typeFilter.value;
    const stat = statusFilter.value;
    return allRequests.filter(r => {
      if (typ && r.type !== typ) return false;
      if (stat && (r.status || 'New') !== stat) return false;
      if (!term) return true;
      return [r.name,r.company,r.phone,r.email,r.subject,r.location,r.instrument,r.message,r.type].some(v => String(v || '').toLowerCase().includes(term));
    });
  }

  function renderRequests() {
    const rows = matchingRequests();
    count.textContent = `${rows.length} request(s) shown · ${allRequests.length} total loaded`;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="12" class="empty-state">No requests match these filters.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(r => {
      const phone = String(r.phone || '').replace(/[^\d+]/g, '');
      const email = String(r.email || '').trim();
      const attachment = r.attachment_path
        ? `<button class="table-link attachment-button" type="button" data-path="${esc(r.attachment_path)}">View file</button>`
        : '—';
      const status = ['New','In Progress','Completed','Closed'].includes(r.status) ? r.status : 'New';
      return `<tr data-id="${esc(r.id)}">
        <td>${esc(dateText(r.created_at))}</td><td>${esc(r.type === 'service' ? 'Service' : 'Product')}</td>
        <td>${esc(r.name)}</td><td>${esc(r.company || '—')}</td>
        <td class="phone-cell">${phone ? `<a href="tel:${esc(phone)}">${esc(r.phone)}</a>` : '—'}</td>
        <td>${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '—'}</td>
        <td>${esc(r.subject || '—')}</td><td>${esc(r.location || '—')}</td><td>${esc(r.instrument || '—')}</td>
        <td class="message-cell">${esc(r.message || '—')}</td>
        <td><select class="status-select" data-status-id="${esc(r.id)}" aria-label="Update request status">${['New','In Progress','Completed','Closed'].map(s => `<option${s===status?' selected':''}>${s}</option>`).join('')}</select></td>
        <td>${attachment}</td>
      </tr>`;
    }).join('');
  }

  async function updateStatus(id, status) {
    say('Saving status…', true);
    const { error } = await client.from('enquiries').update({status}).eq('id', id);
    if (error) {
      say(`Could not update status: ${error.message}`);
      await loadRequests();
      return;
    }
    const row = allRequests.find(r => String(r.id) === String(id));
    if (row) row.status = status;
    say('Status updated.', true);
    renderRequests();
  }

  body.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-status-id]');
    if (select) await updateStatus(select.dataset.statusId, select.value);
  });

  body.addEventListener('click', async (event) => {
    const button = event.target.closest('.attachment-button');
    if (!button) return;
    const path = button.dataset.path;
    button.disabled = true;
    button.textContent = 'Preparing…';
    const { data, error } = await client.storage.from('service-attachments').createSignedUrl(path, 300);
    button.disabled = false;
    button.textContent = 'View file';
    if (error || !data?.signedUrl) {
      say('Could not open attachment. Check the private bucket and admin SELECT policy in Supabase.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  });

  document.getElementById('refreshButton').addEventListener('click', loadRequests);
  document.getElementById('applyFilters').addEventListener('click', renderRequests);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') renderRequests(); });
  document.getElementById('clearFilters').addEventListener('click', () => { searchInput.value=''; typeFilter.value=''; statusFilter.value=''; renderRequests(); });
  document.getElementById('logoutButton').addEventListener('click', async () => { await client.auth.signOut(); window.location.replace('admin.html'); });

  (async () => { if (await checkSession()) await loadRequests(); })();
})();
