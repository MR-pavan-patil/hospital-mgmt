// doctor_schedule.js v7 — Better visual grid

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DSHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

let _scheduleDoctor = null;
let _scheduleSlots  = [];

async function initScheduleSection() {
  await populateDropdown('schedule-doctor-select', 'doctors', 'name');
  const sel = document.getElementById('schedule-doctor-select');
  if (sel) sel.onchange = (e) => loadSchedule(e.target.value);
}

async function loadSchedule(doctorId) {
  _scheduleDoctor = doctorId;
  const wrap = document.getElementById('schedule-grid-wrap');
  if (!wrap) return;
  if (!doctorId) { wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Select a doctor to view their schedule</div>'; return; }
  wrap.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted)"><div class="spinner" style="margin:0 auto 10px"></div>Loading schedule...</div>';
  const { data, error } = await sb.from('doctor_schedules').select('*').eq('doctor_id', doctorId);
  if (error) { wrap.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Error: ${error.message}</div>`; return; }
  _scheduleSlots = data || [];
  renderScheduleGrid(wrap);
}

function renderScheduleGrid(wrap) {
  const COLORS = {
    available: { bg: 'linear-gradient(135deg,#1565c0,#1976d2)', text: '#fff', icon: '👨‍⚕️' },
    break:     { bg: 'linear-gradient(135deg,#e65100,#f57c00)', text: '#fff', icon: '☕' },
    leave:     { bg: 'linear-gradient(135deg,#b71c1c,#d32f2f)', text: '#fff', icon: '🏖' },
  };

  let html = `<div style="overflow-x:auto">
  <table style="width:100%;border-collapse:collapse;min-width:680px;font-size:12px">
  <thead><tr>
    <th style="width:68px;background:#f8fafd;padding:10px 8px;border:1px solid var(--border);color:var(--muted);font-size:10px;font-weight:700;text-transform:uppercase;text-align:center">Time</th>
    ${DAYS.map((d,i) => `<th style="background:#f8fafd;padding:10px 8px;border:1px solid var(--border);color:var(--muted);font-size:10px;font-weight:700;text-transform:uppercase;text-align:center">
      ${DSHORT[i]}<div style="font-size:8.5px;font-weight:500;opacity:0.6;margin-top:1px">${d}</div>
    </th>`).join('')}
  </tr></thead>
  <tbody>`;

  HOURS.forEach(hour => {
    html += `<tr>
      <td style="border:1px solid var(--border);padding:7px 6px;color:var(--muted);font-size:10.5px;font-weight:700;background:#fafbfd;text-align:center;white-space:nowrap">${hour}</td>`;
    DAYS.forEach(day => {
      const slot = _scheduleSlots.find(s => s.day_of_week === day && s.start_time?.slice(0,5) === hour);
      if (slot) {
        const c = COLORS[slot.slot_type] || COLORS.available;
        html += `<td style="border:1px solid var(--border);padding:4px">
          <div onclick="editSlot('${slot.id}')" title="Click to edit" cursor="pointer"
            style="background:${c.bg};color:${c.text};border-radius:6px;padding:5px 7px;cursor:pointer;transition:opacity 0.15s;font-size:10.5px;font-weight:700;line-height:1.3"
            onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">
            ${c.icon} ${slot.notes || slot.slot_type}
            <div style="font-size:9.5px;opacity:0.82;margin-top:1px">${hour}–${slot.end_time?.slice(0,5)||'?'}</div>
          </div>
        </td>`;
      } else {
        html += `<td style="border:1px solid var(--border);padding:4px;cursor:pointer;transition:background 0.15s;min-height:52px"
          onclick="openSlotModal('${day}','${hour}')"
          onmouseover="this.style.background='rgba(25,118,210,0.05)'" onmouseout="this.style.background=''">
          <div style="min-height:40px;display:flex;align-items:center;justify-content:center;color:transparent;font-size:18px;font-weight:300;transition:color 0.15s"
            onmouseover="this.style.color='rgba(25,118,210,0.35)'" onmouseout="this.style.color='transparent'">+</div>
        </td>`;
      }
    });
    html += '</tr>';
  });

  html += `</tbody></table></div>
  <div style="display:flex;gap:16px;padding:12px 16px;border-top:1px solid var(--border);font-size:11.5px;color:var(--muted);flex-wrap:wrap">
    <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--accent);display:inline-block"></span>Available</span>
    <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#f57c00;display:inline-block"></span>Break</span>
    <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--danger);display:inline-block"></span>Leave</span>
    <span style="margin-left:auto;font-size:10.5px">Click empty cell to add · Click slot to edit</span>
  </div>`;

  wrap.innerHTML = html;
}

function openSlotModal(day, hour) {
  if (!_scheduleDoctor) return showToast('Select a doctor first', 'error');
  document.getElementById('slot-id').value        = '';
  document.getElementById('slot-doctor-id').value = _scheduleDoctor;
  document.getElementById('slot-day').value        = day;
  document.getElementById('slot-start').value      = hour;
  const endH = String(parseInt(hour) + 1).padStart(2,'0');
  document.getElementById('slot-end').value         = endH + ':00';
  document.getElementById('slot-type').value        = 'available';
  document.getElementById('slot-notes').value       = '';
  document.getElementById('slot-modal-title').textContent = 'Add Schedule Slot';
  openModal('slot-modal');
}

function addSlot(day, hour) { openSlotModal(day||'Monday', hour||'09:00'); }

function editSlot(id) {
  const slot = _scheduleSlots.find(s => s.id === id);
  if (!slot) return;
  document.getElementById('slot-id').value         = slot.id;
  document.getElementById('slot-doctor-id').value  = slot.doctor_id;
  document.getElementById('slot-day').value         = slot.day_of_week;
  document.getElementById('slot-start').value       = slot.start_time?.slice(0,5)||'';
  document.getElementById('slot-end').value         = slot.end_time?.slice(0,5)||'';
  document.getElementById('slot-type').value        = slot.slot_type;
  document.getElementById('slot-notes').value       = slot.notes||'';
  document.getElementById('slot-modal-title').textContent = 'Edit Schedule Slot';
  openModal('slot-modal');
}

async function saveSlot() {
  const id = document.getElementById('slot-id').value;
  const payload = {
    doctor_id:   document.getElementById('slot-doctor-id').value,
    day_of_week: document.getElementById('slot-day').value,
    start_time:  document.getElementById('slot-start').value,
    end_time:    document.getElementById('slot-end').value,
    slot_type:   document.getElementById('slot-type').value,
    notes:       document.getElementById('slot-notes').value.trim(),
  };
  if (!payload.doctor_id) return showToast('Doctor not set', 'error');
  let error;
  if (id) ({ error } = await sb.from('doctor_schedules').update(payload).eq('id', id));
  else    ({ error } = await sb.from('doctor_schedules').insert(payload));
  if (error) return showToast('Save failed: ' + error.message, 'error');
  showToast('Schedule updated!', 'success');
  closeModal('slot-modal');
  loadSchedule(_scheduleDoctor);
}

async function deleteSlot() {
  const id = document.getElementById('slot-id').value;
  if (!id) { closeModal('slot-modal'); return; }
  if (!confirm('Remove this slot?')) return;
  await sb.from('doctor_schedules').delete().eq('id', id);
  showToast('Slot removed', 'success');
  closeModal('slot-modal');
  loadSchedule(_scheduleDoctor);
}
