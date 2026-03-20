// reminders.js — WhatsApp & SMS Appointment Reminders

async function loadReminders() {
  const today = new Date();
  const threeDays = new Date(today); threeDays.setDate(today.getDate() + 3);

  const { data } = await sb
    .from('appointments')
    .select('*, patients(name, phone), doctors(name, specialization)')
    .eq('status', 'scheduled')
    .gte('appointment_date', today.toISOString().slice(0,10))
    .lte('appointment_date', threeDays.toISOString().slice(0,10))
    .order('appointment_date');

  renderReminderList(data || []);
}

function renderReminderList(appts) {
  const el = document.getElementById('reminder-list');
  if (!appts.length) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)">No upcoming appointments in next 3 days 🎉</div>';
    return;
  }
  el.innerHTML = appts.map(a => {
    const phone = (a.patients?.phone || '').replace(/\D/g,'');
    const date  = formatDate(a.appointment_date);
    const time  = a.appointment_time || '';
    const msg   = encodeURIComponent(`Hello ${a.patients?.name}, your appointment with Dr. ${a.doctors?.name} (${a.doctors?.specialization}) is scheduled on ${date}${time ? ' at ' + time : ''}. Please arrive 10 minutes early. - MediCare Hospital`);
    const waURL = `https://wa.me/91${phone}?text=${msg}`;
    const smsURL= `sms:+91${phone}?body=${msg}`;

    return `
    <div class="reminder-row">
      <div class="reminder-info">
        <div class="reminder-name">${a.patients?.name || '—'}</div>
        <div class="reminder-detail">
          👨‍⚕️ Dr. ${a.doctors?.name || '—'} · ${a.doctors?.specialization || ''}<br/>
          📅 ${date}${time ? ' at ' + time : ''} · 📞 ${a.patients?.phone || 'No phone'}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        ${phone ? `<a href="${waURL}" target="_blank" class="btn-wa">💬 WhatsApp</a>` : '<span style="font-size:12px;color:var(--muted)">No phone</span>'}
        ${phone ? `<a href="${smsURL}" class="btn-sms">📱 SMS</a>` : ''}
      </div>
    </div>`;
  }).join('');
}

function copyReminderMsg(name, doctorName, spec, date, time) {
  const msg = `Hello ${name}, your appointment with Dr. ${doctorName} (${spec}) is on ${date}${time ? ' at ' + time : ''}. Please arrive 10 minutes early. - MediCare Hospital`;
  navigator.clipboard.writeText(msg).then(() => showToast('Message copied!', 'success'));
}

// ── AMBULANCE TRACKING ─────────────────────────────────────

let allAmbulances = [];

async function loadAmbulances() {
  const { data, error } = await sb.from('ambulances').select('*').order('vehicle_number');
  if (error) return showToast('Error loading ambulances', 'error');
  allAmbulances = data || [];
  renderAmbulanceCards(allAmbulances);
}

function renderAmbulanceCards(list) {
  const grid = document.getElementById('ambulance-grid');
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">No ambulances registered. Add one!</div>';
    return;
  }
  grid.innerHTML = list.map(a => `
    <div class="ambulance-card">
      <div class="amb-header">
        <div class="amb-id">🚑 ${a.vehicle_number}</div>
        <span class="amb-status ${a.status}">${a.status}</span>
      </div>
      <div class="amb-info">
        <div class="amb-row">👤 Driver: <strong>${a.driver_name || '—'}</strong></div>
        <div class="amb-row">📞 Contact: <strong>${a.driver_phone || '—'}</strong></div>
        <div class="amb-row">🏥 Type: <strong>${a.ambulance_type || 'Basic'}</strong></div>
        ${a.current_assignment ? `<div class="amb-row">📍 On duty: <strong>${a.current_assignment}</strong></div>` : ''}
      </div>
      <div class="amb-map">
        <div class="amb-map-dots"></div>
        ${a.status === 'dispatched' ? `<div class="amb-pulse" style="left:${30+Math.random()*40}%;top:${30+Math.random()*40}%"></div><span style="position:relative;z-index:1;font-size:12px">📍 Live Tracking</span>` : `<span style="position:relative;z-index:1;font-size:12px;color:var(--muted)">🏥 At Base</span>`}
      </div>
      <div class="amb-actions">
        <button class="btn med-btn edit" style="flex:1" onclick="openAmbModal('${a.id}')">✏ Edit</button>
        <button class="btn med-btn" style="flex:1;background:rgba(16,185,129,0.1);color:#059669" onclick="quickDispatch('${a.id}', '${a.status}')">
          ${a.status === 'available' ? '🚑 Dispatch' : '✅ Return'}
        </button>
        <button class="btn med-btn del" style="flex:0.5" onclick="deleteAmb('${a.id}')">🗑</button>
      </div>
    </div>`).join('');
}

async function quickDispatch(id, currentStatus) {
  const newStatus = currentStatus === 'available' ? 'dispatched' : 'available';
  const assignment = newStatus === 'dispatched' ? prompt('Assignment details (patient/location):') : null;
  if (newStatus === 'dispatched' && !assignment) return;
  const { error } = await sb.from('ambulances').update({ status: newStatus, current_assignment: assignment || null }).eq('id', id);
  if (error) return showToast('Update failed', 'error');
  showToast(newStatus === 'dispatched' ? '🚑 Ambulance dispatched!' : '✅ Ambulance returned to base', 'success');
  loadAmbulances();
}

function openAmbModal(id = null) {
  const a = id ? allAmbulances.find(x => x.id === id) : null;
  document.getElementById('amb-modal-title').textContent = a ? 'Edit Ambulance' : 'Add Ambulance';
  document.getElementById('amb-id-field').value  = a?.id || '';
  document.getElementById('amb-number').value    = a?.vehicle_number || '';
  document.getElementById('amb-driver').value    = a?.driver_name || '';
  document.getElementById('amb-phone').value     = a?.driver_phone || '';
  document.getElementById('amb-type').value      = a?.ambulance_type || 'Basic';
  document.getElementById('amb-status-sel').value= a?.status || 'available';
  openModal('amb-modal');
}

async function saveAmb() {
  const id = document.getElementById('amb-id-field').value;
  const payload = {
    vehicle_number:  document.getElementById('amb-number').value.trim(),
    driver_name:     document.getElementById('amb-driver').value.trim(),
    driver_phone:    document.getElementById('amb-phone').value.trim(),
    ambulance_type:  document.getElementById('amb-type').value,
    status:          document.getElementById('amb-status-sel').value,
  };
  if (!payload.vehicle_number) return showToast('Vehicle number required', 'error');
  let error;
  if (id) ({ error } = await sb.from('ambulances').update(payload).eq('id', id));
  else    ({ error } = await sb.from('ambulances').insert(payload));
  if (error) return showToast('Save failed: ' + error.message, 'error');
  showToast('Ambulance saved!', 'success');
  closeModal('amb-modal');
  loadAmbulances();
}

async function deleteAmb(id) {
  if (!confirm('Remove this ambulance?')) return;
  await sb.from('ambulances').delete().eq('id', id);
  showToast('Ambulance removed', 'success');
  loadAmbulances();
}
