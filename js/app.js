// app.js v6-fixed — Clean, reliable navigation

// ── Utilities ────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch(e) { return d; }
}

function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

function openModal(id)  { document.getElementById(id)?.classList.add('active');    }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
  if (!e.target.closest('.topbar-search'))
    document.getElementById('global-search-results')?.classList.remove('show');
});

// ── Dropdowns with cache ──────────────────────────────────────
async function populateDropdown(selectId, table, labelField) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current   = select.value;
  const cacheKey  = `dropdown_${table}`;
  let data        = Cache.get(cacheKey);
  if (!data) {
    const res = await sb.from(table).select('id, ' + labelField).order(labelField).limit(500);
    data = res.data || [];
    Cache.set(cacheKey, data, 5 * 60000);
  }
  const label = table === 'patients' ? 'Patient' : table === 'doctors' ? 'Doctor' : table;
  select.innerHTML = `<option value="">— Select ${label} —</option>` +
    data.map(r => `<option value="${r.id}">${r[labelField]}</option>`).join('');
  if (current) select.value = current;
}

function invalidateDropdown(table) { Cache.invalidate(`dropdown_${table}`); }

// ── Dark Mode ─────────────────────────────────────────────────
function initDarkMode() { setTheme(localStorage.getItem('hms-theme') || 'light'); }

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('hms-theme', theme);
  const btn = document.getElementById('dark-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleDarkMode() {
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

// ── Mobile Sidebar ────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

// ── Global Search ─────────────────────────────────────────────
let _searchTimer;
async function handleGlobalSearch(q) {
  const results = document.getElementById('global-search-results');
  if (!q.trim()) { results?.classList.remove('show'); return; }
  results?.classList.add('show');
  if (results) results.innerHTML = '<div class="gsr-empty">Searching...</div>';
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(async () => {
    try {
      const [pr, dr, mr] = await Promise.all([
        sb.from('patients').select('id,name,phone,blood_group').ilike('name', `%${q}%`).limit(4),
        sb.from('doctors').select('id,name,specialization').ilike('name', `%${q}%`).limit(3),
        sb.from('pharmacy_inventory').select('id,medicine_name,stock_quantity').ilike('medicine_name', `%${q}%`).limit(3),
      ]);
      let html = '';
      const close = `document.getElementById('global-search-results').classList.remove('show');document.getElementById('global-search-input').value=''`;

      if ((pr.data||[]).length) {
        html += '<div class="gsr-section-label">Patients</div>';
        html += (pr.data||[]).map(p => `
          <div class="gsr-item" onclick="showSection('patients');${close}">
            <div class="gsr-icon">🧑‍⚕️</div>
            <div><div class="gsr-main">${p.name}</div><div class="gsr-sub">${p.phone||''} · ${p.blood_group||'—'}</div></div>
          </div>`).join('');
      }
      if ((dr.data||[]).length) {
        html += '<div class="gsr-section-label">Doctors</div>';
        html += (dr.data||[]).map(d => `
          <div class="gsr-item" onclick="showSection('doctors');${close}">
            <div class="gsr-icon">👨‍⚕️</div>
            <div><div class="gsr-main">${d.name}</div><div class="gsr-sub">${d.specialization||''}</div></div>
          </div>`).join('');
      }
      if ((mr.data||[]).length) {
        html += '<div class="gsr-section-label">Medicines</div>';
        html += (mr.data||[]).map(m => `
          <div class="gsr-item" onclick="showSection('pharmacy');${close}">
            <div class="gsr-icon">💊</div>
            <div><div class="gsr-main">${m.medicine_name}</div><div class="gsr-sub">Stock: ${m.stock_quantity}</div></div>
          </div>`).join('');
      }
      if (results) results.innerHTML = html || `<div class="gsr-empty">No results for "<strong>${q}</strong>"</div>`;
    } catch(e) {
      if (results) results.innerHTML = '<div class="gsr-empty">Search unavailable</div>';
    }
  }, 350);
}

// ── Navigation ────────────────────────────────────────────────
const ALL_SECTIONS = [
  'dashboard','patients','doctors','appointments',
  'billing','lab','pharmacy','reports',
  'history','schedule','prescriptions'
];

const _loaded  = new Set();
const _loading = new Set();

const SECTION_LOADERS = {
  dashboard:     () => loadDashboard(),
  patients:      () => loadPatients(),
  doctors:       () => loadDoctors(),
  appointments:  () => loadAppointments(),
  billing:       () => loadBilling(),
  lab:           () => loadLab(),
  pharmacy:      () => loadPharmacy(),
  reports:       () => loadReports(),
  history:       () => initHistorySection(),
  schedule:      () => initScheduleSection(),
  prescriptions: () => loadPrescriptions(),
};

let _currentSection = null;

// ← This is called from onclick in nav buttons
function showSection(name) {
  if (_currentSection === name) return;
  _currentSection = name;
  closeSidebar();

  // Show / hide sections
  ALL_SECTIONS.forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.style.display = (s === name) ? 'block' : 'none';
  });

  // Update active state on ALL nav buttons (both static + any dynamic)
  document.querySelectorAll('[data-section]').forEach(el => {
    el.classList.toggle('active', el.dataset.section === name);
  });

  // Load data for this section (once, unless forceReload)
  const forceReload = ['dashboard','reports'].includes(name);
  if ((!_loaded.has(name) || forceReload) && !_loading.has(name)) {
    _loading.add(name);
    const loader = SECTION_LOADERS[name];
    if (loader) {
      Promise.resolve(loader()).finally(() => {
        _loaded.add(name);
        _loading.delete(name);
      });
    }
  }
}

// ── Search debounce setup ─────────────────────────────────────
function setupSearch(inputId, loadFn) {
  const el = document.getElementById(inputId);
  if (!el) return;
  let t;
  el.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => loadFn(el.value.trim()), 350);
  });
}

// ── Init ──────────────────────────────────────────────────────
async function init() {
  initDarkMode();

  const session = await getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  // Load profile
  const profile = await getCurrentProfile();
  const name = profile?.name || session.user.email.split('@')[0];
  const role = (profile?.role === 'doctor') ? 'doctor' : 'admin';
  const cfg  = ROLE_CONFIG[role];

  // Update user info in sidebar
  const nameEl   = document.getElementById('user-name');
  const roleEl   = document.getElementById('user-role');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl)   nameEl.textContent   = name;
  if (roleEl)   { roleEl.textContent = cfg.label; roleEl.style.background = cfg.bg; roleEl.style.color = cfg.color; }
  if (avatarEl) { avatarEl.textContent = name.charAt(0).toUpperCase(); avatarEl.style.background = cfg.color; }

  // Apply role-based nav visibility
  initRBAC(role);

  // Background preload
  Cache.preload();

  // Button listeners
  document.getElementById('logout-btn')?.addEventListener('click', signOut);
  document.getElementById('dark-toggle')?.addEventListener('click', toggleDarkMode);
  document.getElementById('mobile-menu-btn')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
  document.getElementById('global-search-input')?.addEventListener('input', e => handleGlobalSearch(e.target.value));

  // Module search boxes
  setupSearch('search-patients',     loadPatients);
  setupSearch('search-doctors',      loadDoctors);
  setupSearch('search-appointments', loadAppointments);
  setupSearch('search-billing',      loadBilling);
  setupSearch('search-lab',          loadLab);
  setupSearch('search-pharmacy',     loadPharmacy);

  // Greeting
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const greetEl = document.getElementById('dash-greeting');
  if (greetEl) greetEl.textContent = `${greet}, ${name.split(' ')[0]}! 👋`;
  const dateEl = document.getElementById('dash-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Start at Dashboard
  showSection('dashboard');
}

window.addEventListener('DOMContentLoaded', init);
