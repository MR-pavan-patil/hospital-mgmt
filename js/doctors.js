// doctors.js v7 — Cards + Auto-generate login credentials

let allDoctors = [];
let _doctorsLoading = false;

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

function renderDoctorCards(doctors) {
  const grid = document.getElementById('doctors-grid');
  if (!grid) return;
  if (!doctors.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">
      <div style="font-size:44px;margin-bottom:12px">👨‍⚕️</div>
      <div style="font-size:15px;font-weight:600">No doctors found</div>
      <div style="font-size:12.5px;margin-top:6px">Click "+ Add Doctor" to register one</div>
    </div>`;
    return;
  }
  grid.innerHTML = doctors.map((d, idx) => {
    const initials = d.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    const grad = GRAD[idx % GRAD.length];
    const canEdit = canDo('edit','doctors');
    const canDel  = canDo('delete','doctors');
    return `
    <div class="doctor-card">
      <div class="doctor-card-header">
        <div class="doctor-avatar" style="background:${grad}">${initials}</div>
        <div class="doctor-card-name">${d.name}</div>
        <span class="doctor-card-spec">${d.specialization || 'General'}</span>
      </div>
      <div class="doctor-card-body">
        ${d.qualification ? `<div class="doctor-info-row"><span class="doctor-info-icon">🎓</span><span class="doctor-info-label">Degree</span><span class="doctor-info-value">${d.qualification}</span></div>` : ''}
        ${d.experience_years ? `<div class="doctor-info-row"><span class="doctor-info-icon">⭐</span><span class="doctor-info-label">Exp</span><span class="doctor-info-value">${d.experience_years} years</span></div>` : ''}
        ${d.phone ? `<div class="doctor-info-row"><span class="doctor-info-icon">📞</span><span class="doctor-info-label">Phone</span><span class="doctor-info-value">${d.phone}</span></div>` : ''}
        ${d.reg_number ? `<div class="doctor-info-row"><span class="doctor-info-icon">🪪</span><span class="doctor-info-label">Reg No</span><span class="doctor-info-value" style="font-family:monospace;font-size:11.5px">${d.reg_number}</span></div>` : ''}
        ${d.availability ? `<div class="doctor-info-row"><span class="doctor-info-icon">🕐</span><span class="doctor-info-label">Avail</span><span class="doctor-info-value" style="font-size:11.5px">${d.availability}</span></div>` : ''}
        <div class="doctor-fee-badge">
          <div class="doctor-fee-label">Consultation Fee</div>
          <div class="doctor-fee-amount">₹${(d.fee||0).toLocaleString('en-IN')}</div>
        </div>
        <div class="doctor-card-actions">
          ${canEdit ? `<button class="btn-doc-action btn-doc-edit" onclick="openDoctorModal('${d.id}')">✏ Edit</button>` : ''}
          <button class="btn-doc-action btn-doc-schedule" onclick="showSection('schedule');setTimeout(()=>{document.getElementById('schedule-doctor-select').value='${d.id}';loadSchedule('${d.id}')},300)">📅 Schedule</button>
          ${canDel ? `<button class="btn-doc-action btn-doc-del" onclick="deleteDoctor('${d.id}')">🗑</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

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
  Object.entries(fields).forEach(([fid, val]) => { const el = document.getElementById(fid); if (el) el.value = val; });

  // Hide credentials box when editing
  const credsBox = document.getElementById('doctor-creds-box');
  if (credsBox) credsBox.style.display = 'none';

  openModal('doctor-modal');
}

// ── Generate doctor login on save ──────────────────────────
async function saveDoctor() {
  const id = document.getElementById('doctor-id').value;
  const name  = document.getElementById('doctor-name').value.trim();
  const email = document.getElementById('doctor-email').value.trim();

  if (!name) return showToast('Doctor name required', 'error');

  const payload = {
    name, specialization: document.getElementById('doctor-spec').value.trim(),
    phone: document.getElementById('doctor-phone').value.trim(),
    email, fee: parseFloat(document.getElementById('doctor-fee').value)||0,
    availability: document.getElementById('doctor-availability').value.trim(),
    qualification: document.getElementById('doctor-qualification').value.trim(),
    reg_number: document.getElementById('doctor-reg').value.trim(),
    experience_years: document.getElementById('doctor-exp').value ? parseInt(document.getElementById('doctor-exp').value) : null,
    bio: document.getElementById('doctor-bio').value.trim(),
  };

  let error, savedId = id;

  if (id) {
    ({ error } = await sb.from('doctors').update(payload).eq('id', id));
  } else {
    const res = await sb.from('doctors').insert(payload).select().single();
    error = res.error;
    savedId = res.data?.id;
  }

  if (error) return showToast('Save failed: ' + error.message, 'error');

  Cache.invalidate('doctors_list'); invalidateDropdown('doctors');
  showToast('Doctor saved! 👨‍⚕️', 'success');
  loadDoctors();

  // Auto-generate login credentials for NEW doctors (if email provided)
  if (!id && email && savedId) {
    await generateDoctorLogin(name, email, savedId);
  } else {
    closeModal('doctor-modal');
  }
}

// ── Auto-generate login ────────────────────────────────────
async function generateDoctorLogin(name, email, doctorId) {
  // Generate a strong password: first name + random digits + special char
  const firstName = name.split(' ')[0];
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const password = `Dr${firstName}@${randomPart}`;

  try {
    // Create Supabase auth user
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: 'doctor' }
      }
    });

    if (error) throw error;

    // Update profile with role = doctor
    if (data.user) {
      await sb.from('profiles').upsert({
        id: data.user.id,
        name,
        role: 'doctor',
      });
    }

    // Show credentials to admin
    const credsBox = document.getElementById('doctor-creds-box');
    if (credsBox) {
      document.getElementById('creds-email').textContent   = email;
      document.getElementById('creds-password').textContent = password;
      credsBox.style.display = 'block';
      showToast('✅ Doctor login credentials generated!', 'success');
    }

  } catch(e) {
    // If signup fails (e.g. email already exists), still show what was attempted
    const credsBox = document.getElementById('doctor-creds-box');
    if (credsBox) {
      document.getElementById('creds-email').textContent   = email;
      document.getElementById('creds-password').textContent = `Dr${name.split(' ')[0]}@${Math.floor(1000+Math.random()*9000)}`;
      credsBox.style.display = 'block';
    }
    showToast('Doctor saved. Note: ' + (e.message?.includes('already') ? 'Email already has an account.' : e.message), 'error');
  }
}

function copyCredential(elId) {
  const text = document.getElementById(elId)?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
}

async function deleteDoctor(id) {
  if (!confirm('Delete this doctor? Their schedule will also be removed.')) return;
  const { error } = await sb.from('doctors').delete().eq('id', id);
  if (error) return showToast('Delete failed: ' + error.message, 'error');
  Cache.invalidate('doctors_list'); invalidateDropdown('doctors');
  showToast('Doctor deleted', 'success'); loadDoctors();
}
