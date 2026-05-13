// ===== Auth State =====
function getAuthState() {
  const userId   = localStorage.getItem('authUserId');
  const username = localStorage.getItem('authUsername');
  return (userId && username) ? { userId, username } : null;
}

function setAuthState(userId, username) {
  localStorage.setItem('authUserId', userId);
  localStorage.setItem('authUsername', username);
}

function clearAuthState() {
  localStorage.removeItem('authUserId');
  localStorage.removeItem('authUsername');
}

// ===== State =====
let USER_ID = null;
let entries = [];
let currentTab = 'log';
let currentPeriod = '7d';
let currentBikeType = 'all';
let runCount = 1;
const MAX_RUNS = 10;
let editingEntryId = null;

// login form mode: 'login' | 'register'
let authMode = 'login';

// ===== DOM =====
const form           = document.getElementById('entry-form');
const submitBtn      = document.getElementById('submit-btn');
const formError      = document.getElementById('form-error');
const sessionSummary = document.getElementById('session-summary');
const sessionList    = document.getElementById('session-list');
const historyStatus  = document.getElementById('history-status');
const historyListEl  = document.getElementById('history-list');

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => {
  const auth = getAuthState();
  if (!auth) {
    showLoginScreen();
    return;
  }
  startApp(auth);
});

// ===== Auth UI =====
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-nav').classList.add('hidden');
  document.getElementById('main-content').classList.add('hidden');
  document.getElementById('user-bar').classList.add('hidden');
  setupLoginForm();
}

function showAppUI(auth) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-nav').classList.remove('hidden');
  document.getElementById('main-content').classList.remove('hidden');
  document.getElementById('user-bar').classList.remove('hidden');
  document.getElementById('user-display-name').textContent = auth.username;
}

// ===== Login / Register Form =====
function setupLoginForm() {
  authMode = 'login';
  updateLoginFormMode();

  const loginForm = document.getElementById('login-form');
  const fresh = loginForm.cloneNode(true);
  loginForm.parentNode.replaceChild(fresh, loginForm);
  fresh.addEventListener('submit', handleAuthSubmit);

  document.getElementById('login-toggle-btn').addEventListener('click', toggleAuthMode);
}

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  updateLoginFormMode();
  document.getElementById('login-error').classList.add('hidden');
}

function updateLoginFormMode() {
  const isRegister = authMode === 'register';
  document.getElementById('login-heading').textContent         = isRegister ? 'Create Account' : 'Sign In';
  document.getElementById('login-btn').textContent             = isRegister ? 'Create Account' : 'Sign In';
  document.getElementById('login-toggle-text').textContent     = isRegister ? 'Already have an account?' : "Don't have an account?";
  document.getElementById('login-toggle-btn').textContent      = isRegister ? 'Sign in' : 'Create one';
  const pwInput = document.getElementById('login-password');
  if (pwInput) pwInput.autocomplete = isRegister ? 'new-password' : 'current-password';
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const username  = document.getElementById('login-username').value.trim();
  const password  = document.getElementById('login-password').value;
  const loginBtn  = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');

  loginError.classList.add('hidden');

  if (!username || !password) {
    loginError.textContent = 'Please enter a username and password.';
    loginError.classList.remove('hidden');
    return;
  }

  loginBtn.disabled    = true;
  loginBtn.textContent = authMode === 'register' ? 'Creating…' : 'Signing in…';

  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

  try {
    const res  = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || 'Something went wrong. Please try again.';
      loginError.classList.remove('hidden');
      return;
    }

    setAuthState(data.userId, data.username);
    startApp({ userId: data.userId, username: data.username });
  } catch {
    loginError.textContent = 'Could not connect. Check your connection and try again.';
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled    = false;
    loginBtn.textContent = authMode === 'register' ? 'Create Account' : 'Sign In';
  }
}

// ===== Start App (after auth) =====
function startApp(auth) {
  USER_ID = auth.userId;
  showAppUI(auth);
  setDefaultDate();
  loadEntries();

  form.addEventListener('submit', handleSaveSession);
  document.getElementById('add-run-btn').addEventListener('click', addRunSlot);
  document.getElementById('logout-btn').addEventListener('click', logout);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHistoryTab();
    });
  });

  document.querySelectorAll('.bike-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentBikeType = btn.dataset.bike;
      document.querySelectorAll('.bike-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHistoryTab();
    });
  });

  document.getElementById('type').addEventListener('change', renderSessionPanel);
  document.getElementById('date').addEventListener('change', renderSessionPanel);
  document.getElementById('session-bike-type').addEventListener('change', renderSessionPanel);
}

function logout() {
  clearAuthState();
  USER_ID         = null;
  entries         = [];
  currentTab      = 'log';
  currentPeriod   = '7d';
  currentBikeType = 'all';
  showLoginScreen();
}

function setDefaultDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${year}-${month}-${day}`;
}

// ===== Tab Switching =====
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.getElementById('tab-log').classList.toggle('hidden', tab !== 'log');
  document.getElementById('tab-history').classList.toggle('hidden', tab !== 'history');

  if (tab === 'history') renderHistoryTab();
  if (tab === 'log')     renderSessionPanel();
}

// ===== API =====
async function loadEntries() {
  try {
    const res = await fetch('/api/entries?userId=' + encodeURIComponent(USER_ID));
    if (!res.ok) throw new Error('Server error ' + res.status);
    entries = await res.json();
    renderSessionPanel();
  } catch {
    sessionSummary.textContent = 'Could not load entries. Check your connection.';
  }
}

async function handleSaveSession(e) {
  e.preventDefault();
  hideError();

  const times = [...document.querySelectorAll('.run-input')]
    .map(input => parseFloat(input.value))
    .filter(val => val > 0);

  if (!times.length) {
    showError('Please enter at least one run time.');
    return;
  }

  const type     = document.getElementById('type').value;
  const bikeType = document.getElementById('session-bike-type').value;
  const date     = document.getElementById('date').value;
  const location = document.getElementById('location').value.trim();
  const notes    = document.getElementById('notes').value.trim();

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Saving…';

  try {
    const results = await Promise.all(
      times.map(timeSec =>
        fetch('/api/entries', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: USER_ID, type, bikeType, timeSec, date, location, notes }),
        }).then(res => {
          if (!res.ok) throw new Error('Failed to save a run.');
          return res.json();
        })
      )
    );

    results.forEach(created => entries.unshift(created));

    resetRunSlots();
    document.getElementById('notes').value = '';
    renderSessionPanel();
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save Session';
  }
}

// ===== Run Slots =====
function addRunSlot() {
  if (runCount >= MAX_RUNS) return;

  const existingBtn = document.getElementById('add-run-btn');
  if (existingBtn) existingBtn.remove();

  runCount++;

  const slot = document.createElement('div');
  slot.className = 'run-slot';
  slot.innerHTML = `
    <label class="run-label">Run ${runCount}</label>
    <div class="run-slot-inputs">
      <input
        type="number"
        class="run-input"
        step="0.0001"
        min="0.0001"
        inputmode="decimal"
        placeholder="34.5210"
      />
      ${runCount < MAX_RUNS ? '<button type="button" class="add-run-btn" id="add-run-btn">+ Run</button>' : ''}
    </div>
  `;

  document.getElementById('run-slots').appendChild(slot);

  const newBtn = slot.querySelector('.add-run-btn');
  if (newBtn) newBtn.addEventListener('click', addRunSlot);

  slot.querySelector('.run-input').focus();
}

function resetRunSlots() {
  runCount = 1;
  document.getElementById('run-slots').innerHTML = `
    <div class="run-slot">
      <label class="run-label">Run 1</label>
      <div class="run-slot-inputs">
        <input
          type="number"
          class="run-input"
          step="0.0001"
          min="0.0001"
          inputmode="decimal"
          placeholder="34.5210"
        />
        <button type="button" class="add-run-btn" id="add-run-btn">+ Run</button>
      </div>
    </div>
  `;
  document.getElementById('add-run-btn').addEventListener('click', addRunSlot);
}

// ===== Session Panel =====
function renderSessionPanel() {
  const date     = document.getElementById('date').value;
  const type     = document.getElementById('type').value;
  const bikeType = document.getElementById('session-bike-type').value;

  const sessionEntries = getSessionEntries(date, type, bikeType);

  if (!sessionEntries.length) {
    sessionSummary.textContent = 'No runs logged yet for this session';
    sessionList.innerHTML = '';
    return;
  }

  const avg      = average(sessionEntries);
  const count    = sessionEntries.length;
  const typeLabel = type === 'block' ? 'block starts' : 'gate starts';
  const bikeLabel = bikeType === 'cruiser' ? 'Cruiser' : 'Class';
  sessionSummary.innerHTML =
    `<strong>${count}</strong> ${typeLabel} · ${bikeLabel} &nbsp;·&nbsp; Avg <strong>${fmt(avg)}</strong>`;

  const ordered = [...sessionEntries].reverse();
  sessionList.innerHTML = ordered.map((e, i) => {
    if (editingEntryId === e.id) {
      return `<li class="session-item editing" data-entry-id="${e.id}">
                <span class="session-num">${i + 1}</span>
                <input type="number" class="session-edit-input" step="0.0001" min="0.0001" value="${e.time_sec}" />
                <button class="session-save-btn">Save</button>
                <button class="session-cancel-btn">Cancel</button>
              </li>`;
    }
    return `<li class="session-item" data-entry-id="${e.id}"><span class="session-num">${i + 1}</span><span class="session-time">${fmt(e.time_sec)}</span>${e.notes ? `<span class="session-note">${esc(e.notes)}</span>` : ''}</li>`;
  }).join('');

  attachSessionListeners();
}

function getSessionEntries(date, type, bikeType) {
  return entries.filter(e => e.date === date && e.type === type && (e.bike_type || 'class') === bikeType);
}

function attachSessionListeners() {
  sessionList.querySelectorAll('.session-item').forEach(item => {
    if (!item.classList.contains('editing')) {
      item.addEventListener('click', () => startEditEntry(item.dataset.entryId));
    }
  });

  sessionList.querySelectorAll('.session-save-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const li = btn.closest('.session-item');
      const newTime = parseFloat(li.querySelector('.session-edit-input').value);
      saveEditEntry(li.dataset.entryId, newTime);
    });
  });

  sessionList.querySelectorAll('.session-cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelEditEntry();
    });
  });

  const editInput = sessionList.querySelector('.session-edit-input');
  if (editInput) editInput.focus();
}

function startEditEntry(entryId) {
  editingEntryId = entryId;
  renderSessionPanel();
}

async function saveEditEntry(entryId, newTime) {
  if (isNaN(newTime) || newTime <= 0) {
    alert('Please enter a valid positive time.');
    return;
  }

  try {
    const res = await fetch(`/api/entries/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, timeSec: newTime }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to save entry.');
      return;
    }

    const updated = await res.json();
    const idx = entries.findIndex(e => e.id === entryId);
    if (idx >= 0) entries[idx] = updated;

    editingEntryId = null;
    renderSessionPanel();
    renderHistoryTab();
  } catch (err) {
    alert('Could not save entry. Check your connection and try again.');
  }
}

function cancelEditEntry() {
  editingEntryId = null;
  renderSessionPanel();
}

// ===== History Tab =====
function renderHistoryTab() {
  const filtered     = filterByPeriod(entries, currentPeriod);
  const bikeFiltered = filterByBikeType(filtered, currentBikeType);
  renderStats(bikeFiltered);
  renderHistoryList(bikeFiltered);
}

function renderStats(list) {
  const sprints = list.filter(e => e.type === 'sprint');
  const blocks  = list.filter(e => e.type === 'block');

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

function renderHistoryList(list) {
  if (!list.length) {
    historyStatus.textContent = 'No entries in this period.';
    historyStatus.classList.remove('hidden');
    historyListEl.innerHTML = '';
    return;
  }

  historyStatus.classList.add('hidden');

  const grouped = currentPeriod === 'all'
    ? groupEntriesByMonth(list)
    : groupEntriesByDate(list);

  historyListEl.innerHTML = grouped.map(({ label, sprints, blocks }) => {
    const sprintRow = sprints.length
      ? `<div class="day-stat-row">
           <span class="entry-badge badge-sprint">Gate Start</span>
           <span class="day-count">${sprints.length} runs</span>
           <span class="day-avg">Avg ${fmt(average(sprints))}</span>
           <span class="day-pr">PR ${fmt(pr(sprints).time_sec)}</span>
         </div>`
      : '';

    const blockRow = blocks.length
      ? `<div class="day-stat-row">
           <span class="entry-badge badge-block">Block Start</span>
           <span class="day-count">${blocks.length} runs</span>
           <span class="day-avg">Avg ${fmt(average(blocks))}</span>
           <span class="day-pr">PR ${fmt(pr(blocks).time_sec)}</span>
         </div>`
      : '';

    return `
      <div class="day-card">
        <div class="day-header">${label}</div>
        ${sprintRow}
        ${blockRow}
      </div>
    `;
  }).join('');
}

// ===== Stat Helpers =====
function average(list) {
  if (!list.length) return null;
  return list.reduce((sum, e) => sum + e.time_sec, 0) / list.length;
}

function pr(list) {
  if (!list.length) return null;
  return list.reduce((best, e) => (e.time_sec < best.time_sec ? e : best));
}

function filterByBikeType(list, bikeType) {
  if (bikeType === 'all') return list;
  return list.filter(e => (e.bike_type || 'class') === bikeType);
}

// ===== Period / Grouping Helpers =====
function filterByPeriod(list, period) {
  if (period === 'all') return list;

  const days    = period === '7d' ? 7 : 30;
  const cutoff  = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return list.filter(e => e.date >= cutoffStr);
}

function groupEntriesByDate(list) {
  const map = {};
  for (const e of list) {
    if (!map[e.date]) map[e.date] = { key: e.date, label: fmtDateLong(e.date), sprints: [], blocks: [] };
    if (e.type === 'sprint') map[e.date].sprints.push(e);
    else                      map[e.date].blocks.push(e);
  }
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

function groupEntriesByMonth(list) {
  const map = {};
  for (const e of list) {
    const monthKey = e.date.slice(0, 7);
    if (!map[monthKey]) map[monthKey] = { key: monthKey, label: fmtMonth(monthKey), sprints: [], blocks: [] };
    if (e.type === 'sprint') map[monthKey].sprints.push(e);
    else                      map[monthKey].blocks.push(e);
  }
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

// ===== Format Helpers =====
function fmt(sec) {
  return sec.toFixed(4) + 's';
}

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

function fmtDateLong(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMonth(yearMonth) {
  if (!yearMonth) return '';
  const [y, m] = yearMonth.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ===== UI Helpers =====
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
