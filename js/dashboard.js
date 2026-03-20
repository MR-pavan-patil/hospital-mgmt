// dashboard.js v5 — Full redesigned dashboard with quick actions, today's appts, activity

let _dashCharts = {};

function destroyDashChart(id) {
  if (_dashCharts[id]) { _dashCharts[id].destroy(); delete _dashCharts[id]; }
}

function animateCounter(el, target, prefix = '', suffix = '') {
  if (!el) return;
  const dur = 900, start = Date.now();
  const tick = () => {
    const prog = Math.min((Date.now() - start) / dur, 1);
    const ease = 1 - Math.pow(1 - prog, 3);
    const val  = Math.round(ease * target);
    el.textContent = prefix + val.toLocaleString('en-IN') + suffix;
    if (prog < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function getLast6Months() {
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ label: `${names[d.getMonth()]} ${d.getFullYear()}`, key: d.toISOString().slice(0,7) });
  }
  return months;
}

async function loadDashboard() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [pRes, dRes, aRes, bRes, todayAppts, recentActivity, apptData, billingData, genderData, lowStockRes] = await Promise.all([
      sb.from('patients').select('id', { count: 'exact', head: true }),
      sb.from('doctors').select('id', { count: 'exact', head: true }),
      sb.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
      sb.from('billing').select('total_amount, paid_amount, payment_status'),
      // Today's appointments
      sb.from('appointments')
        .select('*, patients(name, phone), doctors(name, specialization)')
        .eq('appointment_date', today)
        .eq('status', 'scheduled')
        .order('appointment_time'),
      // Recent activity — last 8 records from appointments + billing
      sb.from('appointments')
        .select('id, created_at, status, patients(name), doctors(name)')
        .order('created_at', { ascending: false })
        .limit(5),
      // Charts data
      sb.from('appointments').select('appointment_date, status')
        .gte('appointment_date', (() => { const d = new Date(); d.setMonth(d.getMonth()-5); d.setDate(1); return d.toISOString().slice(0,10); })()),
      sb.from('billing').select('paid_amount, created_at')
        .gte('created_at', (() => { const d = new Date(); d.setMonth(d.getMonth()-5); d.setDate(1); return d.toISOString(); })()),
      sb.from('patients').select('gender'),
      sb.from('pharmacy_inventory').select('medicine_name, stock_quantity, expiry_date')
        .or('stock_quantity.lt.10,expiry_date.lt.' + new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10)),
    ]);

    // ── Stat Cards ──
    animateCounter(document.getElementById('stat-patients'), pRes.count || 0);
    animateCounter(document.getElementById('stat-doctors'),  dRes.count || 0);
    animateCounter(document.getElementById('stat-appointments'), aRes.count || 0);
    const pending = (bRes.data || []).reduce((s, r) => r.payment_status !== 'paid' ? s + ((r.total_amount||0)-(r.paid_amount||0)) : s, 0);
    animateCounter(document.getElementById('stat-billing'), Math.round(pending), '₹');

    // ── Low Stock Alert ──
    const lowCount = (lowStockRes.data || []).length;
    const alertEl = document.getElementById('dash-low-stock-alert');
    if (alertEl) {
      if (lowCount > 0) {
        alertEl.innerHTML = `⚠️ <strong>${lowCount} medicines</strong> are low in stock or expiring soon. <a onclick="showSection('pharmacy')" style="color:inherit;text-decoration:underline;cursor:pointer">View Pharmacy →</a>`;
        alertEl.style.display = 'flex';
      } else {
        alertEl.style.display = 'none';
      }
    }

    // ── Today's Appointments ──
    const todayEl = document.getElementById('today-appts-list');
    if (todayEl) {
      const appts = todayAppts.data || [];
      if (!appts.length) {
        todayEl.innerHTML = '<div class="today-appt-item" style="justify-content:center;color:var(--muted);font-size:13px">🎉 No appointments scheduled for today</div>';
      } else {
        todayEl.innerHTML = appts.map(a => `
          <div class="today-appt-item">
            <span class="appt-time-badge">${a.appointment_time ? a.appointment_time.slice(0,5) : 'All day'}</span>
            <div class="appt-info">
              <div class="appt-info-name">${a.patients?.name || '—'}</div>
              <div class="appt-info-doc">Dr. ${a.doctors?.name || '—'} · ${a.doctors?.specialization || ''}</div>
            </div>
            <button class="btn-complete-appt" onclick="completeAppointment('${a.id}', '${a.patients?.name || ''}', '${a.patients?.phone || ''}')">
              ✓ Done
            </button>
          </div>`).join('');
        document.getElementById('today-appts-count').textContent = appts.length;
      }
    }

    // ── Recent Activity ──
    const actEl = document.getElementById('activity-list');
    if (actEl) {
      const acts = recentActivity.data || [];
      if (!acts.length) {
        actEl.innerHTML = '<div class="activity-item" style="justify-content:center;color:var(--muted);font-size:13px">No recent activity</div>';
      } else {
        const colors = { scheduled: 'blue', completed: 'green', cancelled: 'red' };
        const icons  = { scheduled: '📅', completed: '✅', cancelled: '❌' };
        actEl.innerHTML = acts.map(a => `
          <div class="activity-item">
            <div class="activity-dot ${colors[a.status] || 'blue'}">${icons[a.status] || '📅'}</div>
            <div class="activity-body">
              <div class="activity-title">Appointment ${a.status} — ${a.patients?.name || 'Patient'} with Dr. ${a.doctors?.name || '—'}</div>
              <div class="activity-time">${timeAgo(a.created_at)}</div>
            </div>
          </div>`).join('');
      }
    }

    // ── Charts ──
    const months = getLast6Months();
    const apptByMonth = { scheduled:{}, completed:{}, cancelled:{} };
    months.forEach(m => { apptByMonth.scheduled[m.key]=0; apptByMonth.completed[m.key]=0; apptByMonth.cancelled[m.key]=0; });
    (apptData.data||[]).forEach(a => {
      const k = a.appointment_date?.slice(0,7);
      if (apptByMonth[a.status]?.[k] !== undefined) apptByMonth[a.status][k]++;
    });

    destroyDashChart('dash-appt-chart');
    const ctx1 = document.getElementById('dash-appt-chart')?.getContext('2d');
    if (ctx1) _dashCharts['dash-appt-chart'] = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          { label:'Scheduled', data: months.map(m=>apptByMonth.scheduled[m.key]),  backgroundColor:'rgba(14,165,233,0.85)', borderRadius:5 },
          { label:'Completed', data: months.map(m=>apptByMonth.completed[m.key]),  backgroundColor:'rgba(16,185,129,0.85)', borderRadius:5 },
          { label:'Cancelled', data: months.map(m=>apptByMonth.cancelled[m.key]),  backgroundColor:'rgba(239,68,68,0.7)',   borderRadius:5 },
        ]
      },
      options: { responsive:true, plugins:{ legend:{position:'bottom',labels:{padding:12,font:{size:11}}} }, scales:{ x:{grid:{display:false},ticks:{font:{size:11}}}, y:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:11}}} } }
    });

    const revByMonth = {};
    months.forEach(m => revByMonth[m.key] = 0);
    (billingData.data||[]).forEach(b => {
      const k = b.created_at?.slice(0,7);
      if (revByMonth[k] !== undefined) revByMonth[k] += (b.paid_amount||0);
    });

    destroyDashChart('dash-rev-chart');
    const ctx2 = document.getElementById('dash-rev-chart')?.getContext('2d');
    if (ctx2) _dashCharts['dash-rev-chart'] = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: months.map(m=>m.label),
        datasets: [{
          label:'Revenue (₹)', data: months.map(m=>revByMonth[m.key]),
          borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.08)',
          borderWidth:2.5, fill:true, tension:0.4,
          pointBackgroundColor:'#10b981', pointRadius:5, pointHoverRadius:7,
        }]
      },
      options: { responsive:true, plugins:{ legend:{display:false} }, scales:{ x:{grid:{display:false},ticks:{font:{size:11}}}, y:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:11},callback:v=>'₹'+Math.round(v).toLocaleString('en-IN')}} } }
    });

    const gender = {Male:0, Female:0, Other:0};
    (genderData.data||[]).forEach(p => { if (p.gender in gender) gender[p.gender]++; else gender.Other++; });
    destroyDashChart('dash-gender-chart');
    const ctx3 = document.getElementById('dash-gender-chart')?.getContext('2d');
    if (ctx3) _dashCharts['dash-gender-chart'] = new Chart(ctx3, {
      type: 'doughnut',
      data: {
        labels: ['Male','Female','Other'],
        datasets: [{ data:[gender.Male,gender.Female,gender.Other], backgroundColor:['rgba(14,165,233,0.85)','rgba(236,72,153,0.85)','rgba(168,85,247,0.85)'], borderWidth:0, hoverOffset:6 }]
      },
      options: { responsive:true, cutout:'68%', plugins:{ legend:{position:'bottom',labels:{padding:12,font:{size:11}}} } }
    });

  } catch(e) { console.error('Dashboard error:', e); }
}

// ── Time Ago Helper ────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// ── Complete Appointment with Automation ──────────────────
async function completeAppointment(apptId, patientName, patientPhone) {
  const { error } = await sb.from('appointments').update({ status: 'completed' }).eq('id', apptId);
  if (error) return showToast('Update failed: ' + error.message, 'error');
  showToast(`✅ Appointment completed for ${patientName}`, 'success');
  // Invalidate cache
  Cache.invalidate('appts_list');
  // Reload dashboard
  loadDashboard();
  // Show automation popup
  showAutomationPopup(apptId, patientName);
}

// ── Automation Popup ───────────────────────────────────────
function showAutomationPopup(apptId, patientName) {
  const popup = document.getElementById('automation-popup');
  if (!popup) return;
  popup.dataset.apptId      = apptId;
  popup.dataset.patientName = patientName;
  popup.querySelector('.auto-popup-sub').textContent =
    `${patientName}'s appointment is marked complete. Do you want to create a prescription & generate a bill?`;
  popup.classList.add('show');
  // Auto hide after 12s
  setTimeout(() => popup.classList.remove('show'), 12000);
}

function dismissAutomationPopup() {
  document.getElementById('automation-popup')?.classList.remove('show');
}

async function doAutoActions() {
  const popup = document.getElementById('automation-popup');
  const patientName = popup?.dataset.patientName || '';
  dismissAutomationPopup();
  showToast(`Opening prescription builder for ${patientName}...`, 'success');
  showSection('prescriptions');
  setTimeout(() => openRxBuilder(), 400);
}
