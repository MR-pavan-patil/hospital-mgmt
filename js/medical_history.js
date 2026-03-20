// medical_history.js v4 — Fixed DB + Timeline

let _historyPatientId = null;

async function initHistorySection() {
  await populateDropdown('history-patient-select', 'patients', 'name');
  const sel = document.getElementById('history-patient-select');
  if (sel) sel.onchange = (e) => loadHistory(e.target.value);
  // Reset stats
  ['hist-visits','hist-labs','hist-bills'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
}

async function loadHistory(patientId) {
  _historyPatientId = patientId;
  const el = document.getElementById('history-timeline');
  if (!patientId) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Select a patient to view their medical history</div>';
    return;
  }
  el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted)"><div class="spinner" style="margin:0 auto 12px"></div>Loading history...</div>';

  try {
    const [apptRes, labRes, billRes, rxRes, recordRes] = await Promise.all([
      sb.from('appointments')
        .select('id, appointment_date, appointment_time, status, notes, doctors(name, specialization)')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false }),
      sb.from('lab_reports')
        .select('id, test_name, test_date, result, status, notes, doctors(name)')
        .eq('patient_id', patientId)
        .order('test_date', { ascending: false }),
      sb.from('billing')
        .select('id, total_amount, paid_amount, payment_status, payment_method, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      sb.from('prescriptions')
        .select('id, diagnosis, medicines, created_at, doctors(name)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      sb.from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false }),
    ]);

    // Update stats
    const totalPaid = (billRes.data || []).reduce((s, b) => s + (b.paid_amount || 0), 0);
    document.getElementById('hist-visits').textContent = (apptRes.data || []).length;
    document.getElementById('hist-labs').textContent   = (labRes.data  || []).length;
    document.getElementById('hist-bills').textContent  = '₹' + totalPaid.toLocaleString('en-IN');

    // Build unified timeline
    const timeline = [];

    (recordRes.data || []).forEach(r => timeline.push({
      date: r.record_date, type: r.record_type || 'visit', icon: '📋',
      title: r.title, body: r.description || '', sub: r.doctor_notes || '',
      tags: [r.record_type || 'Record'],
    }));

    (rxRes.data || []).forEach(r => {
      const meds = Array.isArray(r.medicines) ? r.medicines.map(m => m.name).join(', ') : '';
      timeline.push({
        date: r.created_at?.slice(0,10), type: 'medicine', icon: '💊',
        title: `Prescription — ${r.diagnosis || 'General'}`,
        body: meds ? `Medicines: ${meds}` : '',
        tags: ['Prescription', r.doctors?.name || ''].filter(Boolean),
      });
    });

    (apptRes.data || []).forEach(a => timeline.push({
      date: a.appointment_date, type: 'visit', icon: '🏥',
      title: `OPD Visit — ${a.doctors?.specialization || 'General'}`,
      body: a.notes || 'Consultation appointment',
      tags: [a.doctors?.name || '', a.status].filter(Boolean),
    }));

    (labRes.data || []).forEach(l => timeline.push({
      date: l.test_date || new Date().toISOString().slice(0,10), type: 'lab', icon: '🧪',
      title: `Lab Test: ${l.test_name}`,
      body: l.result ? `Result: ${l.result}` : 'Result pending',
      sub: l.notes || '',
      tags: [l.doctors?.name || '', l.status].filter(Boolean),
    }));

    (billRes.data || []).forEach(b => timeline.push({
      date: b.created_at?.slice(0,10), type: 'medicine', icon: '💰',
      title: `Bill — ₹${(b.total_amount || 0).toLocaleString('en-IN')}`,
      body: `Paid: ₹${(b.paid_amount||0).toLocaleString('en-IN')} · Method: ${b.payment_method || '—'}`,
      tags: [b.payment_status],
    }));

    timeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!timeline.length) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:14px">📋 No records found for this patient yet</div>';
      return;
    }

    el.innerHTML = timeline.map(item => `
      <div class="history-item">
        <div class="history-dot ${item.type}">${item.icon}</div>
        <div class="history-content">
          <div class="history-header">
            <div class="history-title">${item.title}</div>
            <div class="history-date">${formatDate(item.date)}</div>
          </div>
          ${item.body ? `<div class="history-body">${item.body}</div>` : ''}
          ${item.sub ? `<div class="history-body" style="margin-top:4px;font-style:italic">${item.sub}</div>` : ''}
          <div class="history-tags">${item.tags.map(t => `<span class="history-tag">${t}</span>`).join('')}</div>
        </div>
      </div>`).join('');

  } catch(e) {
    console.error('History error:', e);
    el.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Error loading history: ${e.message}</div>`;
  }
}

function openHistoryModal() {
  if (!_historyPatientId) return showToast('Please select a patient first', 'error');
  document.getElementById('hr-patient-id').value = _historyPatientId;
  document.getElementById('hr-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('hr-title').value = '';
  document.getElementById('hr-desc').value  = '';
  document.getElementById('hr-notes').value = '';
  openModal('history-record-modal');
}

async function saveHistoryRecord() {
  const payload = {
    patient_id:   document.getElementById('hr-patient-id').value,
    record_type:  document.getElementById('hr-type').value,
    title:        document.getElementById('hr-title').value.trim(),
    description:  document.getElementById('hr-desc').value.trim(),
    doctor_notes: document.getElementById('hr-notes').value.trim(),
    record_date:  document.getElementById('hr-date').value,
  };
  if (!payload.title) return showToast('Title required', 'error');
  const { error } = await sb.from('medical_records').insert(payload);
  if (error) return showToast('Save failed: ' + error.message, 'error');
  showToast('Record saved!', 'success');
  closeModal('history-record-modal');
  loadHistory(_historyPatientId);
}
