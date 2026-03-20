// doctors.js v9 — Admin generates credentials, stored in DB, shown to admin

let allDoctors = [];
let _doctorsLoading = false;

// ── Generate password: MediCare@FirstName + 4 random digits ──
function generatePassword(name) {
  const firstName = name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `MediCare@${firstName}${suffix}`;
}

// ── Skeleton loading ──────────────────────────────────────
function showDoctorSkeletons() {
  const grid = document.getElementById('doctors-grid');
  if (!grid) return;
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-header"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line med"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line med"></div>
      </div>
    </div>`).join('');
}

// ── Load Doctors ──────────────────────────────────────────
async function loadDoctors(search = '') {
  if (_doctorsLoading && !search) return;
  _doctorsLoading = true;
  const cacheKey = 'doctors_list';
  let data;
  if (!search) data = Cache.get(cacheKey);
  if (!data) {
    if (!search) showDoctorSkeletons();
    let q = sb.from('doctors').select('*').order('name');
    if (search) q = q.ilike('name', `%${search}%`);
    const res = await q;
    if (res.error) { showToast('Error: ' + res.error.message, 'error'); _doctorsLoading = false; return; }
    data = res.data || [];
    if (!search) Cache.set(cacheKey, data);
  }
  allDoctors = data;
  renderDoctorCards(allDoctors);
  _doctorsLoading = false;
}

const GRAD = [
  'linear-gradient(135deg,#1565c0,#1976d2)',
  'linear-gradient(135deg,#00695c,#00897b)',
  'linear-gradient(135deg,#4527a0,#5c35bb)',
  'linear-gradient(135deg,#e65100,#f57c00)',
  'linear-gradient(135deg,#880e4f,#ad1457)',
  'linear-gradient(135deg,#1b5e20,#2e7d32)',
];

// ── Render Doctor Cards ───────────────────────────────────
function renderDoctorCards(doctors) {
  const grid = document.getElementById('doctors-grid');
  if (!grid) return;
  if (!doctors.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">
      <div style="font-size:44px;margin-bottom:12px">👨‍⚕️</div>
      <div style="font-size:15px;font-weight:600">No doctors yet</div>
      <div style="font-size:12.5px;margin-top:6px">Click "+ Add Doctor" to register</div>
    </div>`;
    return;
  }
  grid.innerHTML = doctors.map((d, idx) => {
    const initials = d.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const grad = GRAD[idx % GRAD.length];
    const canEdit = canDo('edit','doctors');
    const canDel  = canDo('delete','doctors');
    const hasLogin = !!(d.email && d.login_password);
    return `
    <div class="doctor-card">
      <div class="doctor-card-header">
        <div class="doctor-avatar" style="background:${grad}">${initials}</div>
        <div class="doctor-card-name">${d.name}</div>
        <span class="doctor-card-spec">${d.specialization || 'General'}</span>
        ${hasLogin ? '<span style="position:absolute;top:10px;right:10px;background:rgba(16,185,129,0.2);color:#6ee7b7;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:10px">🔐 Login Ready</span>' : ''}
      </div>
      <div class="doctor-card-body">
        ${d.qualification ? `<div class="doctor-info-row"><span class="doctor-info-icon">🎓</span><span class="doctor-info-label">Degree</span><span class="doctor-info-value">${d.qualification}</span></div>` : ''}
        ${d.experience_years ? `<div class="doctor-info-row"><span class="doctor-info-icon">⭐</span><span class="doctor-info-label">Exp</span><span class="doctor-info-value">${d.experience_years} yrs</span></div>` : ''}
        ${d.phone ? `<div class="doctor-info-row"><span class="doctor-info-icon">📞</span><span class="doctor-info-label">Phone</span><span class="doctor-info-value">${d.phone}</span></div>` : ''}
        ${d.email ? `<div class="doctor-info-row"><span class="doctor-info-icon">📧</span><span class="doctor-info-label">Email</span><span class="doctor-info-value" style="font-size:11px">${d.email}</span></div>` : ''}
        ${d.availability ? `<div class="doctor-info-row"><span class="doctor-info-icon">🕐</span><span class="doctor-info-label">Avail</span><span class="doctor-info-value" style="font-size:11.5px">${d.availability}</span></div>` : ''}
        <div class="doctor-fee-badge">
          <div class="doctor-fee-label">Consultation Fee</div>
          <div class="doctor-fee-amount">₹${(d.fee||0).toLocaleString('en-IN')}</div>
        </div>
        <div class="doctor-card-actions">
          ${canEdit ? `<button class="btn-doc-action btn-doc-edit" onclick="openDoctorModal('${d.id}')">✏ Edit</button>` : ''}
          ${hasLogin ? `<button class="btn-doc-action" style="background:rgba(16,185,129,0.1);color:var(--success)" onclick="viewDoctorCreds('${d.id}')">🔑 Credentials</button>` : (d.email ? `<button class="btn-doc-action" style="background:var(--accent-light);color:var(--accent)" onclick="generateCredsForDoctor('${d.id}')">⚡ Gen Login</button>` : '')}
          <button class="btn-doc-action btn-doc-schedule" onclick="showSection('schedule');setTimeout(()=>{document.getElementById('schedule-doctor-select').value='${d.id}';loadSchedule('${d.id}')},300)" title="Schedule">📅</button>
          ${canDel ? `<button class="btn-doc-action btn-doc-del" onclick="deleteDoctor('${d.id}')">🗑</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Open / Save Doctor Modal ──────────────────────────────
function openDoctorModal(id = null) {
  const d = id ? allDoctors.find(x => x.id === id) : null;
  document.getElementById('doctor-modal-title').textContent = d ? 'Edit Doctor' : 'Add New Doctor';
  const fields = {
    'doctor-id': d?.id||'', 'doctor-name': d?.name||'',
    'doctor-spec': d?.specialization||'', 'doctor-fee': d?.fee||'',
    'doctor-phone': d?.phone||'', 'doctor-email': d?.email||'',
    'doctor-availability': d?.availability||'', 'doctor-qualification': d?.qualification||'',
    'doctor-reg': d?.reg_number||'', 'doctor-exp': d?.experience_years||'',
    'doctor-bio': d?.bio||'',
  };
  Object.entries(fields).forEach(([fid,val]) => { const el=document.getElementById(fid); if(el) el.value=val; });
  document.getElementById('doctor-creds-box').style.display = 'none';
  openModal('doctor-modal');
}

async function saveDoctor() {
  const id    = document.getElementById('doctor-id').value;
  const name  = document.getElementById('doctor-name').value.trim();
  const email = document.getElementById('doctor-email').value.trim();
  if (!name) return showToast('Doctor name is required', 'error');

  // Generate password for NEW doctors with email
  const isNew = !id;
  const generatedPassword = (isNew && email) ? generatePassword(name) : null;

  const payload = {
    name,
    specialization:   document.getElementById('doctor-spec').value.trim(),
    phone:            document.getElementById('doctor-phone').value.trim(),
    email,
    fee:              parseFloat(document.getElementById('doctor-fee').value)||0,
    availability:     document.getElementById('doctor-availability').value.trim(),
    qualification:    document.getElementById('doctor-qualification').value.trim(),
    reg_number:       document.getElementById('doctor-reg').value.trim(),
    experience_years: document.getElementById('doctor-exp').value ? parseInt(document.getElementById('doctor-exp').value) : null,
    bio:              document.getElementById('doctor-bio').value.trim(),
  };

  // Store generated password in DB (so admin can view it later)
  if (generatedPassword) payload.login_password = generatedPassword;

  let error, savedData;
  if (id) {
    ({ error } = await sb.from('doctors').update(payload).eq('id', id));
  } else {
    const res = await sb.from('doctors').insert(payload).select().single();
    error = res.error; savedData = res.data;
  }

  if (error) return showToast('Save failed: ' + error.message, 'error');

  Cache.invalidate('doctors_list'); invalidateDropdown('doctors');
  showToast('Doctor saved! 👨‍⚕️', 'success');
  loadDoctors();

  // Show credentials immediately for new doctor
  if (isNew && email && generatedPassword) {
    showCredsInModal(name, email, generatedPassword);
  } else {
    closeModal('doctor-modal');
  }
}

// ── Show credentials inside the modal after save ──────────
function showCredsInModal(name, email, password) {
  const box = document.getElementById('doctor-creds-box');
  document.getElementById('dc-name').textContent     = name;
  document.getElementById('dc-email').textContent    = email;
  document.getElementById('dc-password').textContent = password;
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Generate credentials for existing doctor without login ─
async function generateCredsForDoctor(doctorId) {
  const d = allDoctors.find(x => x.id === doctorId);
  if (!d || !d.email) return showToast('Doctor has no email set', 'error');

  const password = generatePassword(d.name);
  const { error } = await sb.from('doctors').update({ login_password: password }).eq('id', doctorId);
  if (error) return showToast('Failed: ' + error.message, 'error');

  Cache.invalidate('doctors_list');
  showToast('✅ Login credentials generated!', 'success');
  loadDoctors();

  // Show in popup
  openCredsPopup(d.name, d.email, password);
}

// ── View stored credentials ────────────────────────────────
function viewDoctorCreds(doctorId) {
  const d = allDoctors.find(x => x.id === doctorId);
  if (!d) return;
  openCredsPopup(d.name, d.email, d.login_password || '—');
}

function openCredsPopup(name, email, password) {
  document.getElementById('cp-name').textContent     = name;
  document.getElementById('cp-email').textContent    = email;
  document.getElementById('cp-password').textContent = password;
  openModal('creds-popup-modal');
}

function copyText(elId) {
  const txt = document.getElementById(elId)?.textContent;
  if (!txt || txt === '—') return;
  navigator.clipboard.writeText(txt).then(() => showToast('Copied! 📋', 'success'));
}

async function deleteDoctor(id) {
  if (!confirm('Delete this doctor?')) return;
  const { error } = await sb.from('doctors').delete().eq('id', id);
  if (error) return showToast('Delete failed: ' + error.message, 'error');
  Cache.invalidate('doctors_list'); invalidateDropdown('doctors');
  showToast('Doctor deleted', 'success'); loadDoctors();
}
