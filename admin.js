const c = window.SLS_CONFIG || {};
let token = '';

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[m]));
}

async function createSignedUrl(path) {
  const headers = {
    apikey: c.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(
    `${c.SUPABASE_URL}/storage/v1/object/sign/service-attachments/${encodeURIComponent(path)}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ expiresIn: 3600 })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Could not create attachment link');
  }

  if (!data.signedURL) {
    throw new Error('Signed URL was not returned');
  }

  return data.signedURL.startsWith('http')
    ? data.signedURL
    : `${c.SUPABASE_URL}${data.signedURL}`;
}

async function load() {
  const status = $('loginStatus');
  const refresh = $('refresh');

  if (!token) {
    status.textContent = 'Please login first.';
    return;
  }

  refresh.disabled = true;
  refresh.textContent = 'Loading...';

  try {
    const response = await fetch(
      `${c.SUPABASE_URL}/rest/v1/enquiries?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: c.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    const rows = await response.json();

    if (!response.ok) {
      throw new Error(rows.message || rows.error || 'Could not load enquiries');
    }

    const tbody = document.querySelector('#table tbody');
    tbody.innerHTML = '';

    for (const x of (rows || [])) {
      let attachmentHtml = '<span style="color:#777">None</span>';

      if (x.attachment_path) {
        attachmentHtml = `
          <button
            type="button"
            class="attachment-view"
            data-path="${esc(x.attachment_path)}"
            style="padding:7px 10px;border:1px solid #0b355c;border-radius:6px;background:#fff;color:#0b355c;cursor:pointer;"
          >
            View / Download
          </button>
        `;
      }

      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td style="padding:12px;border-top:1px solid #ddd">
          ${esc(new Date(x.created_at).toLocaleString())}
        </td>

        <td style="padding:12px;border-top:1px solid #ddd">
          ${esc(x.type)}
        </td>

        <td style="padding:12px;border-top:1px solid #ddd">
          <b>${esc(x.name)}</b><br>
          ${esc(x.company || '')}
        </td>

        <td style="padding:12px;border-top:1px solid #ddd">
          ${esc(x.phone)}
        </td>

        <td style="padding:12px;border-top:1px solid #ddd">
          ${esc(x.subject)}
        </td>

        <td style="padding:12px;border-top:1px solid #ddd">
          ${esc(x.location)}
        </td>

        <td style="padding:12px;border-top:1px solid #ddd">
          ${esc(x.message)}
        </td>

        <td style="padding:12px;border-top:1px solid #ddd">
          ${attachmentHtml}
        </td>
      `;

      tbody.appendChild(tr);
    }

    document.querySelectorAll('.attachment-view').forEach((button) => {
      button.addEventListener('click', async () => {
        const oldText = button.textContent;
        button.textContent = 'Opening...';
        button.disabled = true;

        try {
          const path = button.dataset.path;
          const url = await createSignedUrl(path);
          window.open(url, '_blank', 'noopener');
        } catch (error) {
          alert(error.message || 'Could not open attachment');
        } finally {
          button.textContent = oldText;
          button.disabled = false;
        }
      });
    });

    status.textContent = `Loaded ${rows.length} customer request(s).`;

  } catch (error) {
    status.textContent = `Could not load enquiries: ${error.message}`;
  } finally {
    refresh.disabled = false;
    refresh.textContent = 'Refresh';
  }
}

$('login').onclick = async () => {
  const status = $('loginStatus');

  status.textContent = 'Checking...';

  if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) {
    status.textContent = 'Supabase URL/key is missing from config.js.';
    return;
  }

  try {
    const response = await fetch(
      `${c.SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: c.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: $('email').value.trim(),
          password: $('password').value
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      status.textContent =
        data.msg ||
        data.error_description ||
        data.message ||
        'Login failed';
      return;
    }

    token = data.access_token;

    status.textContent = 'Logged in.';

    $('panel').style.display = 'block';

    await load();

  } catch (error) {
    status.textContent = `Login error: ${error.message}`;
  }
};

$('refresh').onclick = load;
