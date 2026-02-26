// ===== User Identity =====
function getUserId() {
  let id = localStorage.getItem('userId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('userId', id);
  }
  return id;
}

const USER_ID = getUserId();

// ===== State =====
let entries = [];

// ===== DOM =====
const form        = document.getElementById('entry-form');
const submitBtn   = document.getElementById('submit-btn');
const formError   = document.getElementById('form-error');
const statusEl    = document.getElementById('entries-status');
const listEl      = document.getElementById('entries-list');

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  loadEntries();
  form.addEventListener('submit', handleSubmit);
});

function setDefaultDate() {
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
}

// ===== API =====
async function loadEntries() {
  showStatus('Loading...');
  try {
    const res = await fetch('/api/entries?userId=' + encodeURIComponent(USER_ID));
    if (!res.ok) throw new Error('Server error ' + res.status);
    entries = await res.json();
    renderAll();
  } catch {
    showStatus('Could not load entries. Check your connection and try refreshing.');
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  hideError();

  const timeSec = parseFloat(document.getElementById('timeSec').value);
  if (!timeSec || timeSec <= 0) {
    showError('Please enter a valid time greater than 0.');
    return;
  }

  const payload = {
    userId:   USER_ID,
    type:     document.getElementById('type').value,
    timeSec,
    date:     document.getElementById('date').value,
    location: document.getElementById('location').value.trim(),
    notes:    document.getElementById('notes').value.trim(),
  };

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Saving…';

  try {
    const res = await fetch('/api/entries', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save entry.');
    }

    const created = await res.json();
    entries.unshift(created);
    renderAll();
    form.reset();
    setDefaultDate();
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save Entry';
  }
}

// ===== Stat Helpers =====
function byType(type) {
  return entries.filter(e => e.type === type);
}

function average(list) {
  if (!list.length) return null;
  return list.reduce((sum, e) => sum + e.time_sec, 0) / list.length;
}

function pr(list) {
  if (!list.length) return null;
  return list.reduce((best, e) => (e.time_sec < best.time_sec ? e : best));
}

function fmt(sec) {
  return sec.toFixed(2) + 's';
}

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

// ===== Render =====
function renderAll() {
  renderStats();
  renderEntries();
}

function renderStats() {
  const sprints = byType('sprint');
  const blocks  = byType('block');

  const sprintAvg = average(sprints);
  const blockAvg  = average(blocks);
  const sprintPR  = pr(sprints);
  const blockPR   = pr(blocks);

  document.getElementById('sprint-avg').textContent = sprintAvg !== null ? fmt(sprintAvg) : '—';
  document.getElementById('block-avg').textContent  = blockAvg  !== null ? fmt(blockAvg)  : '—';

  if (sprintPR) {
    document.getElementById('sprint-pr').textContent        = fmt(sprintPR.time_sec);
    document.getElementById('sprint-pr-detail').textContent =
      [fmtDate(sprintPR.date), sprintPR.location].filter(Boolean).join(' · ');
  } else {
    document.getElementById('sprint-pr').textContent        = '—';
    document.getElementById('sprint-pr-detail').textContent = '';
  }

  if (blockPR) {
    document.getElementById('block-pr').textContent        = fmt(blockPR.time_sec);
    document.getElementById('block-pr-detail').textContent =
      [fmtDate(blockPR.date), blockPR.location].filter(Boolean).join(' · ');
  } else {
    document.getElementById('block-pr').textContent        = '—';
    document.getElementById('block-pr-detail').textContent = '';
  }
}

function renderEntries() {
  if (!entries.length) {
    showStatus('No entries yet. Log your first sprint above!');
    listEl.innerHTML = '';
    return;
  }

  hideStatus();

  listEl.innerHTML = entries.map(entry => {
    const isBlock  = entry.type === 'block';
    const badge    = isBlock ? 'badge-block' : 'badge-sprint';
    const label    = isBlock ? 'Block' : 'Sprint';
    const meta     = [fmtDate(entry.date), entry.location].filter(Boolean).join(' · ');

    return `
      <div class="entry-card">
        <span class="entry-badge ${badge}">${label}</span>
        <div class="entry-body">
          <span class="entry-time">${fmt(entry.time_sec)}</span>
          ${meta   ? `<span class="entry-meta">${esc(meta)}</span>`       : ''}
          ${entry.notes ? `<span class="entry-notes">${esc(entry.notes)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== UI Helpers =====
function showStatus(msg) {
  statusEl.textContent = msg;
  statusEl.classList.remove('hidden');
}

function hideStatus() {
  statusEl.classList.add('hidden');
}

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function hideError() {
  formError.textContent = '';
  formError.classList.add('hidden');
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
