// appointments.js v7 — Better UI + Quick check-in

let allAppointments = [];
let _apptLoading    = false;

async function loadAppointments(search = '') {
  if (_apptLoading && !search) return;
  _apptLoading = true;

  const cacheKey = 'appts_list';
  let data;
  if (!search) data = Cache.get(cacheKey);

  if (!data) {
    const tbody = document.getElementById('appointments-tbody');
    if (tbody && !search) tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner" style="margin:0 auto 8px"></div>Loading appointments...</td></tr>';

    const res = await sb
      .from('appointments')
      .select('id,appointment_date,appointment_time,status,notes,patient_id,doctor_id,patients(name,phone),doctors(name,specialization,fee)')
      .order('appointment_date', { ascending: false })
      .limit(150);

    if (res.error) {
      const tbody = document.getElementById('appointments-tbody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:var(--danger)">⚠ Error: ${res.error.message}</td></tr>`;
      _apptLoading = false; return;
    }
    data = res.data || [];
    if (!search) Cache.set(cacheKey, data);
  }

  allAppointments = data;
  let filtered = allAppointments;
  if (search) {
    const s = search.toLowerCase();
    filtered = allAppointments.filter(a =>
      a.patients?.name?.toLowerCase().includes(s) ||
      a.doctors?.name?.toLowerCase().includes(s)
    );
  }
  renderAppointmentsTable(filtered);
  _apptLoading = false;
}

function renderAppointmentsTable(appts) {
  const tbody = document.getElementById('appointments-tbody');
  if (!tbody) return;
  if (!appts.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No appointments found</td></tr>'; return; }

  const today = new Date().toISOString().slice(0,10);

  tbody.innerHTML = appts.map(a => {
    const isToday   = a.appointment_date === today;
    const isUpcoming = a.appointment_date > today && a.status === 'scheduled';
    const rowStyle  = isToday && a.status === 'scheduled' ? 'background:rgba(25,118,210,0.03)' : '';

    return `<tr style="${rowStyle}">
      <td>
        <div style="display:flex;align-items:center;gap:9px">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--accent);flex-shrink:0">${(a.patients?.name||'?').charAt(0).toUpperCase()}</div>
          <div>
            <strong style="font-size:13px">${a.patients?.name||'—'}</strong>
            ${a.patients?.phone ? `<div style="font-size:11px;color:var(--muted)">${a.patients.phone}</div>` : ''}
          </div>
        </div>
      </td>
      <td>
        <strong style="font-size:12.5px">${a.doctors?.name||'—'}</strong>
        <div style="font-size:11px;color:var(--muted)">${a.doctors?.specialization||''}</div>
      </td>
      <td>
        <div style="font-weight:700;font-size:13px">${formatDate(a.appointment_date)}</div>
        ${isToday ? '<span style="font-size:9.5px;background:var(--accent-light);color:var(--accent);padding:1px 7px;border-radius:10px;font-weight:700">TODAY</span>' : ''}
      </td>
      <td>${a.appointment_time ? `<strong style="font-family:monospace;font-size:13px">${a.appointment_time.slice(0,5)}</strong>` : '—'}</td>
      <td>${a.doctors?.fee ? `<span style="font-size:12.5px;font-weight:600">₹${(a.doctors.fee||0).toLocaleString('en-IN')}</span>` : '—'}</td>
      <td><span class="badge badge-${a.status}"><span class="status-dot dot-${a.status==='completed'?'green':a.status==='cancelled'?'red':'blue'}"></span>${a.status}</span></td>
      <td style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
        ${a.status === 'scheduled' ? `
          <button onclick="checkInPatient('${a.id}','${a.patients?.name||''}','${a.patient_id||''}')" title="Check In"
            style="background:var(--success-bg);color:var(--success);border:none;cursor:pointer;padding:4px 10px;border-radius:6px;font-family:inherit;font-size:11px;font-weight:700;white-space:nowrap">
            ✓ Check In
          </button>` : ''}
        ${actionBtns('appointments', a.id, 'openApptModal', 'deleteAppt')}
      </td>
    </tr>`;
  }).join('');
}

async function checkInPatient(id, patientName, patientId) {
  const { error } = await sb.from('appointments').update({ status: 'completed' }).eq('id', id);
  if (error) return showToast('Update failed', 'error');
  Cache.invalidate('appts_list');
  showToast(`✅ ${patientName} checked in successfully!`, 'success');
  loadAppointments();
  showAutomationPopup(id, patientName);
}

async function openApptModal(id = null) {
  await populateDropdown('appt-patient', 'patients', 'name');
  await populateDropdown('appt-doctor',  'doctors',  'name');
  const a = id ? allAppointments.find(x => x.id === id) : null;
  document.getElementById('appt-modal-title').textContent = a ? 'Edit Appointment' : 'Book Appointment';
  document.getElementById('appt-id').value      = a?.id || '';
  document.getElementById('appt-patient').value = a?.patient_id || '';
  document.getElementById('appt-doctor').value  = a?.doctor_id || '';
  document.getElementById('appt-date').value    = a?.appointment_date || new Date().toISOString().slice(0,10);
  document.getElementById('appt-time').value    = a?.appointment_time?.slice(0,5) || '';
  document.getElementById('appt-status').value  = a?.status || 'scheduled';
  document.getElementById('appt-notes').value   = a?.notes || '';
  openModal('appt-modal');
}

async function saveAppt() {
  const id = document.getElementById('appt-id').value;
  const payload = {
    patient_id:       document.getElementById('appt-patient').value,
    doctor_id:        document.getElementById('appt-doctor').value,
    appointment_date: document.getElementById('appt-date').value,
    appointment_time: document.getElementById('appt-time').value || null,
    status:           document.getElementById('appt-status').value,
    notes:            document.getElementById('appt-notes').value.trim(),
  };
  if (!payload.patient_id || !payload.doctor_id || !payload.appointment_date)
    return showToast('Patient, Doctor and Date are required', 'error');
  let error;
  if (id) ({ error } = await sb.from('appointments').update(payload).eq('id', id));
  else    ({ error } = await sb.from('appointments').insert(payload));
  if (error) return showToast('Save failed: ' + error.message, 'error');
  Cache.invalidate('appts_list');
  showToast('Appointment booked! 📅', 'success');
  closeModal('appt-modal'); loadAppointments();
}

async function deleteAppt(id) {
  if (!confirm('Delete this appointment?')) return;
  await sb.from('appointments').delete().eq('id', id);
  Cache.invalidate('appts_list');
  showToast('Appointment deleted', 'success'); loadAppointments();
}
