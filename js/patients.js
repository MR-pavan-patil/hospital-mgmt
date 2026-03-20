// patients.js v5 — Extended fields: allergies, conditions, insurance, vitals

let allPatients = [];

async function loadPatients(search = '') {
  const cacheKey = 'patients_list';
  let data;
  if (!search) data = Cache.get(cacheKey);
  if (!data) {
    let q = sb.from('patients').select('*').order('created_at', { ascending: false });
    if (search) q = q.ilike('name', `%${search}%`);
    const res = await q;
    if (res.error) return showToast('Error loading patients', 'error');
    data = res.data || [];
    if (!search) Cache.set(cacheKey, data);
  }
  allPatients = data;
  renderPatientsTable(allPatients);
}

function renderPatientsTable(patients) {
  const tbody = document.getElementById('patients-tbody');
  if (!patients.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No patients found</td></tr>'; return; }
  tbody.innerHTML = patients.map(p => {
    const age = p.dob ? Math.floor((Date.now() - new Date(p.dob)) / 3.156e10) : null;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:9px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--accent);flex-shrink:0">${p.name.charAt(0).toUpperCase()}</div>
          <div>
            <strong style="font-size:13px">${p.name}</strong>
            ${p.allergies ? `<div style="font-size:10.5px;color:var(--danger);display:flex;align-items:center;gap:3px;margin-top:1px">⚠ ${p.allergies}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${p.phone ? `<span style="font-size:12.5px">${p.phone}</span>` : '—'}</td>
      <td>${p.gender ? `<span style="font-size:12.5px">${p.gender}</span>` : '—'}</td>
      <td>${p.blood_group ? `<span class="badge" style="background:rgba(211,47,47,0.1);color:var(--danger);font-weight:800">${p.blood_group}</span>` : '—'}</td>
      <td>${age !== null ? `<span style="font-weight:700;font-size:13px">${age}</span><span style="color:var(--muted);font-size:11px"> yrs</span>` : '—'}</td>
      <td>${p.chronic_conditions ? `<span style="font-size:11.5px;color:var(--muted)">${p.chronic_conditions}</span>` : '—'}</td>
      <td>${p.insurance_id ? `<span class="badge badge-scheduled" style="font-size:10.5px">🛡 ${p.insurance_id}</span>` : '—'}</td>
      <td style="display:flex;gap:3px">
        <button class="btn-icon" title="Medical History" onclick="showSection('history');setTimeout(()=>{document.getElementById('history-patient-select').value='${p.id}';loadHistory('${p.id}')},300)" style="background:rgba(109,40,217,0.08);color:var(--purple)">📋</button>
        ${actionBtns('patients', p.id, 'openPatientModal', 'deletePatient')}
      </td>
    </tr>`;
  }).join('');
}

function openPatientModal(id = null) {
  const p = id ? allPatients.find(x => x.id === id) : null;
  document.getElementById('patient-modal-title').textContent = p ? 'Edit Patient' : 'New Patient Registration';
  const fields = {
    'patient-id': p?.id || '', 'patient-name': p?.name || '',
    'patient-phone': p?.phone || '', 'patient-email': p?.email || '',
    'patient-dob': p?.dob || '', 'patient-gender': p?.gender || '',
    'patient-blood': p?.blood_group || '', 'patient-emergency': p?.emergency_contact || '',
    'patient-address': p?.address || '', 'patient-allergies': p?.allergies || '',
    'patient-conditions': p?.chronic_conditions || '', 'patient-insurance': p?.insurance_id || '',
    'patient-weight': p?.weight_kg || '', 'patient-height': p?.height_cm || '',
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  openModal('patient-modal');
}

async function savePatient() {
  const id = document.getElementById('patient-id').value;
  const payload = {
    name:               document.getElementById('patient-name').value.trim(),
    phone:              document.getElementById('patient-phone').value.trim(),
    email:              document.getElementById('patient-email').value.trim(),
    dob:                document.getElementById('patient-dob').value || null,
    gender:             document.getElementById('patient-gender').value,
    blood_group:        document.getElementById('patient-blood').value,
    emergency_contact:  document.getElementById('patient-emergency').value.trim(),
    address:            document.getElementById('patient-address').value.trim(),
    allergies:          document.getElementById('patient-allergies').value.trim(),
    chronic_conditions: document.getElementById('patient-conditions').value.trim(),
    insurance_id:       document.getElementById('patient-insurance').value.trim(),
    weight_kg:          document.getElementById('patient-weight').value ? parseFloat(document.getElementById('patient-weight').value) : null,
    height_cm:          document.getElementById('patient-height').value ? parseFloat(document.getElementById('patient-height').value) : null,
  };
  if (!payload.name) return showToast('Patient name required', 'error');
  let error;
  if (id) ({ error } = await sb.from('patients').update(payload).eq('id', id));
  else    ({ error } = await sb.from('patients').insert(payload));
  if (error) return showToast('Save failed: ' + error.message, 'error');
  Cache.invalidate('patients_list'); invalidateDropdown('patients');
  showToast('Patient saved! 🧑‍⚕️', 'success');
  closeModal('patient-modal'); loadPatients();
}

async function deletePatient(id) {
  if (!confirm('Delete this patient? All their records will be removed.')) return;
  const { error } = await sb.from('patients').delete().eq('id', id);
  if (error) return showToast('Delete failed: ' + error.message, 'error');
  Cache.invalidate('patients_list'); invalidateDropdown('patients');
  showToast('Patient deleted', 'success'); loadPatients();
}
