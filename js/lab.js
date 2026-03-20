// lab.js v6 — With proper loading + DB fix

let allReports = [];

async function loadLab(search = '') {
  const cacheKey = 'lab_list';
  let data;
  if (!search) data = Cache.get(cacheKey);
  if (!data) {
    const tbody = document.getElementById('lab-tbody');
    if (tbody && !search) tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner" style="margin:0 auto 8px"></div>Loading...</td></tr>';

    const res = await sb
      .from('lab_reports')
      .select('id, test_name, test_date, result, status, notes, patient_id, doctor_id, patients(name), doctors(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (res.error) {
      const tbody = document.getElementById('lab-tbody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:var(--danger)">⚠ Error: ${res.error.message}</td></tr>`;
      return;
    }
    data = res.data || [];
    if (!search) Cache.set(cacheKey, data);
  }

  allReports = data;
  let filtered = allReports;
  if (search) {
    const s = search.toLowerCase();
    filtered = allReports.filter(r =>
      r.patients?.name?.toLowerCase().includes(s) ||
      r.test_name?.toLowerCase().includes(s)
    );
  }
  renderLabTable(filtered);
}

function renderLabTable(reports) {
  const tbody = document.getElementById('lab-tbody');
  if (!tbody) return;
  if (!reports.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No lab reports found</td></tr>'; return; }
  tbody.innerHTML = reports.map(r => `
    <tr>
      <td><strong>${r.patients?.name||'—'}</strong></td>
      <td>${r.test_name}</td>
      <td>${r.doctors?.name||'—'}</td>
      <td>${formatDate(r.test_date)}</td>
      <td>${r.result ? r.result.slice(0,40) + (r.result.length > 40 ? '...' : '') : '—'}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
      <td style="display:flex;gap:4px">${actionBtns('lab', r.id, 'openLabModal', 'deleteReport')}</td>
    </tr>`).join('');
}

async function openLabModal(id = null) {
  await populateDropdown('lab-patient', 'patients', 'name');
  await populateDropdown('lab-doctor',  'doctors',  'name');
  const r = id ? allReports.find(x => x.id === id) : null;
  document.getElementById('lab-modal-title').textContent = r ? 'Edit Lab Report' : 'New Lab Report';
  document.getElementById('lab-id').value      = r?.id || '';
  document.getElementById('lab-patient').value = r?.patient_id || '';
  document.getElementById('lab-doctor').value  = r?.doctor_id || '';
  document.getElementById('lab-test').value    = r?.test_name || '';
  document.getElementById('lab-date').value    = r?.test_date || new Date().toISOString().slice(0,10);
  document.getElementById('lab-result').value  = r?.result || '';
  document.getElementById('lab-status').value  = r?.status || 'pending';
  document.getElementById('lab-notes').value   = r?.notes || '';
  openModal('lab-modal');
}

async function saveReport() {
  const id = document.getElementById('lab-id').value;
  const payload = {
    patient_id: document.getElementById('lab-patient').value,
    doctor_id:  document.getElementById('lab-doctor').value  || null,
    test_name:  document.getElementById('lab-test').value.trim(),
    test_date:  document.getElementById('lab-date').value    || null,
    result:     document.getElementById('lab-result').value.trim(),
    status:     document.getElementById('lab-status').value,
    notes:      document.getElementById('lab-notes').value.trim(),
  };
  if (!payload.patient_id || !payload.test_name) return showToast('Patient and Test Name required', 'error');
  let error;
  if (id) ({ error } = await sb.from('lab_reports').update(payload).eq('id', id));
  else    ({ error } = await sb.from('lab_reports').insert(payload));
  if (error) return showToast('Save failed: ' + error.message, 'error');
  Cache.invalidate('lab_list');
  showToast('Lab report saved! 🧪', 'success');
  closeModal('lab-modal');
  loadLab();
}

async function deleteReport(id) {
  if (!confirm('Delete this lab report?')) return;
  const { error } = await sb.from('lab_reports').delete().eq('id', id);
  if (error) return showToast('Delete failed', 'error');
  Cache.invalidate('lab_list');
  showToast('Report deleted', 'success');
  loadLab();
}
