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
let currentTab = 'log';
let currentPeriod = '7d';
let runCount = 1;
const MAX_RUNS = 10;

// ===== DOM =====
const form        = document.getElementById('entry-form');
const submitBtn   = document.getElementById('submit-btn');
const formError   = document.getElementById('form-error');
const sessionSummary = document.getElementById('session-summary');
const sessionList    = document.getElementById('session-list');
const historyStatus  = document.getElementById('history-status');
const historyListEl  = document.getElementById('history-list');

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  loadEntries();
  form.addEventListener('submit', handleSaveSession);
  document.getElementById('add-run-btn').addEventListener('click', addRunSlot);

  // Tab nav
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Period filter
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHistoryTab();
    });
  });
});

function setDefaultDate() {
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
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
          body:    JSON.stringify({ userId: USER_ID, type, timeSec, date, location, notes }),
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

  // Remove the + Run button from the current last slot
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
        step="0.01"
        min="0.01"
        inputmode="decimal"
        placeholder="34.52"
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
          step="0.01"
          min="0.01"
          inputmode="decimal"
          placeholder="34.52"
        />
        <button type="button" class="add-run-btn" id="add-run-btn">+ Run</button>
      </div>
    </div>
  `;
  document.getElementById('add-run-btn').addEventListener('click', addRunSlot);
}

// ===== Session Panel =====
function renderSessionPanel() {
  const date = document.getElementById('date').value;
  const type = document.getElementById('type').value;

  const sessionEntries = getSessionEntries(date, type);

  if (!sessionEntries.length) {
    sessionSummary.textContent = 'No sprints logged yet for this session';
    sessionList.innerHTML = '';
    return;
  }

  const avg   = average(sessionEntries);
  const count = sessionEntries.length;
  const label = type === 'block' ? 'block sprints' : 'sprints';
  sessionSummary.innerHTML =
    `<strong>${count}</strong> ${label} &nbsp;·&nbsp; Avg <strong>${fmt(avg)}</strong>`;

  // Show in chronological order (earliest first) for the session list
  const ordered = [...sessionEntries].reverse();
  sessionList.innerHTML = ordered.map((e, i) =>
    `<li><span class="session-num">${i + 1}</span><span class="session-time">${fmt(e.time_sec)}</span>${e.notes ? `<span class="session-note">${esc(e.notes)}</span>` : ''}</li>`
  ).join('');
}

// Re-render session panel when type or date changes
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('type').addEventListener('change', renderSessionPanel);
  document.getElementById('date').addEventListener('change', renderSessionPanel);
});

function getSessionEntries(date, type) {
  return entries.filter(e => e.date === date && e.type === type);
}

// ===== History Tab =====
function renderHistoryTab() {
  const filtered = filterByPeriod(entries, currentPeriod);
  renderStats(filtered);
  renderHistoryList(filtered);
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
           <span class="entry-badge badge-sprint">Sprint</span>
           <span class="day-count">${sprints.length} runs</span>
           <span class="day-avg">Avg ${fmt(average(sprints))}</span>
           <span class="day-pr">PR ${fmt(pr(sprints).time_sec)}</span>
         </div>`
      : '';

    const blockRow = blocks.length
      ? `<div class="day-stat-row">
           <span class="entry-badge badge-block">Block</span>
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

// ===== Period / Grouping Helpers =====
function filterByPeriod(list, period) {
  if (period === 'all') return list;

  const days  = period === '7d' ? 7 : 30;
  const cutoff = new Date();
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
    const monthKey = e.date.slice(0, 7); // YYYY-MM
    if (!map[monthKey]) map[monthKey] = { key: monthKey, label: fmtMonth(monthKey), sprints: [], blocks: [] };
    if (e.type === 'sprint') map[monthKey].sprints.push(e);
    else                      map[monthKey].blocks.push(e);
  }
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

// ===== Format Helpers =====
function fmt(sec) {
  return sec.toFixed(2) + 's';
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
