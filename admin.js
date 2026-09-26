const c = window.SLS_CONFIG || {};
let token = '';
let allRows = [];

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
    throw new Error(
      data.message ||
      data.error ||
      'Could not create attachment link'
    );
  }

  if (!data.signedURL) {
    throw new Error('Signed URL was not returned');
  }

  let signedUrl = data.signedURL;

  if (signedUrl.startsWith('http')) {
    signedUrl = signedUrl.replace(
      '/object/sign/',
      '/storage/v1/object/sign/'
    );

    return signedUrl;
  }

  if (signedUrl.startsWith('/storage/v1/')) {
    return `${c.SUPABASE_URL}${signedUrl}`;
  }

  if (signedUrl.startsWith('/object/sign/')) {
    return `${c.SUPABASE_URL}/storage/v1${signedUrl}`;
  }

  return `${c.SUPABASE_URL}/storage/v1/${signedUrl}`;
}

function getFilteredRows() {

  const search = $('search').value.trim().toLowerCase();
  const type = $('typeFilter').value;
  const status = $('statusFilter').value;

  return allRows.filter((x) => {

    const searchable = [
      x.name,
      x.company,
      x.phone,
      x.email,
      x.subject,
      x.location,
      x.instrument,
      x.message
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesType =
      !type || x.type === type;

    const matchesStatus =
      !status || (x.status || 'New') === status;

    return matchesSearch && matchesType && matchesStatus;
  });
}

function renderRows(rows) {

  const tbody = document.querySelector('#table tbody');

  tbody.innerHTML = '';

  if (!rows.length) {

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td colspan="12" class="empty-row">
        No matching customer requests found.
      </td>
    `;

    tbody.appendChild(tr);

    $('requestCount').textContent =
      `Showing 0 of ${allRows.length} request(s).`;

    return;
  }

  for (const x of rows) {

    let attachmentHtml =
      '<span style="color:#777">None</span>';

    if (x.attachment_path) {

      attachmentHtml = `
        <button
          type="button"
          class="admin-action attachment-btn attachment-view"
          data-path="${esc(x.attachment_path)}"
        >
          View / Download
        </button>
      `;
    }

    const whatsappNumber =
      String(x.phone || '')
        .replace(/\D/g, '');

    const callLink =
      x.phone
        ? `tel:${esc(String(x.phone).replace(/[^\d+]/g, ''))}`
        : '#';

    const whatsappLink =
      whatsappNumber.length >= 10
        ? `https://wa.me/${whatsappNumber}`
        : '#';

    const emailLink =
      x.email
        ? `mailto:${esc(x.email)}`
        : '#';

    const status =
      x.status || 'New';

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>
        ${esc(new Date(x.created_at).toLocaleString())}
      </td>

      <td>
        ${esc(x.type)}
      </td>

      <td>
        <b>${esc(x.name)}</b><br>
        <span>${esc(x.company || '')}</span>
      </td>

      <td>
        ${esc(x.phone)}
      </td>

      <td>
        ${
          x.email
            ? `<a href="${emailLink}">${esc(x.email)}</a>`
            : '-'
        }
      </td>

      <td>
        ${esc(x.subject)}
      </td>

      <td>
        ${esc(x.location)}
      </td>

      <td>
        ${esc(x.instrument || '-')}
      </td>

      <td style="min-width:260px">
        ${esc(x.message)}
      </td>

      <td>
        <select
          class="status-select status-change"
          data-id="${esc(x.id)}"
          data-current="${esc(status)}"
        >
          <option value="New" ${
            status === 'New' ? 'selected' : ''
          }>
            New
          </option>

          <option value="In Progress" ${
            status === 'In Progress' ? 'selected' : ''
          }>
            In Progress
          </option>

          <option value="Completed" ${
            status === 'Completed' ? 'selected' : ''
          }>
            Completed
          </option>

          <option value="Closed" ${
            status === 'Closed' ? 'selected' : ''
          }>
            Closed
          </option>
        </select>

        <span class="status-note"></span>
      </td>

      <td>
        ${attachmentHtml}
      </td>

      <td style="min-width:180px">

        ${
          x.phone
            ? `<a
                class="admin-action"
                href="${callLink}"
              >Call</a>`
            : ''
        }

        ${
          whatsappNumber.length >= 10
            ? `<a
                class="admin-action"
                href="${whatsappLink}"
                target="_blank"
                rel="noopener"
              >WhatsApp</a>`
            : ''
        }

        ${
          x.email
            ? `<a
                class="admin-action"
                href="${emailLink}"
              >Email</a>`
            : ''
        }

      </td>
    `;

    tbody.appendChild(tr);
  }

  $('requestCount').textContent =
    `Showing ${rows.length} of ${allRows.length} request(s).`;

  attachRowEvents();
}

function attachRowEvents() {

  document
    .querySelectorAll('.attachment-view')
    .forEach((button) => {

      button.addEventListener('click', async () => {

        const oldText = button.textContent;

        button.textContent = 'Opening...';
        button.disabled = true;

        try {

          const path = button.dataset.path;

          const url = await createSignedUrl(path);

          window.open(url, '_blank', 'noopener');

        } catch (error) {

          alert(
            error.message ||
            'Could not open attachment'
          );

        } finally {

          button.textContent = oldText;
          button.disabled = false;
        }

      });

    });

  document
    .querySelectorAll('.status-change')
    .forEach((select) => {

      select.addEventListener('change', async () => {

        const id = select.dataset.id;
        const newStatus = select.value;
        const note =
          select.parentElement.querySelector('.status-note');

        select.disabled = true;
        note.textContent = 'Saving...';

        try {

          const response = await fetch(
            `${c.SUPABASE_URL}/rest/v1/enquiries?id=eq.${encodeURIComponent(id)}`,
            {
              method: 'PATCH',
              headers: {
                apikey: c.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                status: newStatus
              })
            }
          );

          if (!response.ok) {

            const errorText =
              await response.text();

            throw new Error(
              errorText ||
              'Could not update status'
            );
          }

          const row = allRows.find(
            (item) => String(item.id) === String(id)
          );

          if (row) {
            row.status = newStatus;
          }

          note.textContent = 'Saved';

          setTimeout(() => {
            note.textContent = '';
          }, 1500);

        } catch (error) {

          note.textContent = 'Failed';

          alert(
            error.message ||
            'Could not update status'
          );

        } finally {

          select.disabled = false;
        }

      });

    });
}

async function load() {

  const statusBox = $('loginStatus');
  const refresh = $('refresh');

  if (!token) {

    statusBox.textContent =
      'Please login first.';

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

      throw new Error(
        rows.message ||
        rows.error ||
        'Could not load enquiries'
      );
    }

    allRows = rows || [];

    renderRows(
      getFilteredRows()
    );

    statusBox.textContent =
      `Loaded ${allRows.length} customer request(s).`;

  } catch (error) {

    statusBox.textContent =
      `Could not load enquiries: ${error.message}`;

  } finally {

    refresh.disabled = false;
    refresh.textContent = 'Refresh';
  }
}

$('login').onclick = async () => {

  const statusBox = $('loginStatus');

  statusBox.textContent = 'Checking...';

  if (
    !c.SUPABASE_URL ||
    !c.SUPABASE_ANON_KEY
  ) {

    statusBox.textContent =
      'Supabase URL/key is missing from config.js.';

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

      statusBox.textContent =
        data.msg ||
        data.error_description ||
        data.message ||
        'Login failed';

      return;
    }

    token = data.access_token;

    statusBox.textContent =
      'Logged in.';

    $('panel').style.display =
      'block';

    await load();

  } catch (error) {

    statusBox.textContent =
      `Login error: ${error.message}`;
  }
};

$('refresh').onclick = load;

function applyFilters() {
  renderRows(getFilteredRows());
}

$('applyFilters').addEventListener(
  'click',
  applyFilters
);

$('clearFilters').addEventListener(
  'click',
  () => {

    $('search').value = '';
    $('typeFilter').value = '';
    $('statusFilter').value = '';

    renderRows(allRows);
  }
);

$('search').addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyFilters();
    }
  }
);
