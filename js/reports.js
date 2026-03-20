// reports.js — Analytics & Reports using Chart.js

let _charts = {}; // store chart instances to destroy on reload

function destroyChart(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

async function loadReports() {
  document.getElementById('reports-loading').style.display = 'flex';
  document.getElementById('reports-content').style.display = 'none';

  try {
    const [apptData, billingData, patientData, doctorData] = await Promise.all([
      fetchAppointmentStats(),
      fetchRevenueStats(),
      fetchPatientStats(),
      fetchDoctorStats(),
    ]);

    renderAppointmentChart(apptData);
    renderRevenueChart(billingData);
    renderGenderChart(patientData.gender);
    renderTopDoctorsChart(doctorData);
    renderSummaryCards(patientData.total, billingData.totalRevenue, billingData.pending);

  } catch (e) {
    console.error('Reports error:', e);
    showToast('Error loading reports', 'error');
  }

  document.getElementById('reports-loading').style.display = 'none';
  document.getElementById('reports-content').style.display = 'block';
}

// ── Data Fetchers ──────────────────────────────────────────

async function fetchAppointmentStats() {
  // Last 6 months appointments count
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);

  const { data } = await sb
    .from('appointments')
    .select('appointment_date, status')
    .gte('appointment_date', since.toISOString().slice(0, 10));

  const months = getLast6Months();
  const counts = { scheduled: {}, completed: {}, cancelled: {} };
  months.forEach(m => {
    counts.scheduled[m] = 0;
    counts.completed[m] = 0;
    counts.cancelled[m] = 0;
  });

  (data || []).forEach(a => {
    const m = a.appointment_date?.slice(0, 7); // YYYY-MM
    const label = monthLabel(m);
    if (counts[a.status]?.[label] !== undefined) counts[a.status][label]++;
  });

  return { months, counts };
}

async function fetchRevenueStats() {
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);

  const { data } = await sb
    .from('billing')
    .select('total_amount, paid_amount, payment_status, created_at')
    .gte('created_at', since.toISOString());

  const months = getLast6Months();
  const revenue = {};
  months.forEach(m => revenue[m] = 0);

  let totalRevenue = 0, pending = 0;

  (data || []).forEach(b => {
    const m = b.created_at?.slice(0, 7);
    const label = monthLabel(m);
    if (revenue[label] !== undefined) revenue[label] += (b.paid_amount || 0);
    totalRevenue += (b.paid_amount || 0);
    if (b.payment_status !== 'paid') pending += ((b.total_amount || 0) - (b.paid_amount || 0));
  });

  return { months, revenue, totalRevenue, pending };
}

async function fetchPatientStats() {
  const { data, count } = await sb
    .from('patients')
    .select('gender', { count: 'exact' });

  const gender = { Male: 0, Female: 0, Other: 0 };
  (data || []).forEach(p => {
    if (p.gender in gender) gender[p.gender]++;
    else gender['Other']++;
  });

  return { total: count || 0, gender };
}

async function fetchDoctorStats() {
  const { data } = await sb
    .from('appointments')
    .select('doctor_id, doctors(name, specialization)')
    .not('doctor_id', 'is', null);

  const map = {};
  (data || []).forEach(a => {
    const id = a.doctor_id;
    if (!map[id]) map[id] = { name: a.doctors?.name || 'Unknown', count: 0 };
    map[id].count++;
  });

  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

// ── Chart Renderers ────────────────────────────────────────

function renderAppointmentChart({ months, counts }) {
  destroyChart('appt-chart');
  const ctx = document.getElementById('appt-chart').getContext('2d');
  _charts['appt-chart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Scheduled', data: months.map(m => counts.scheduled[m]), backgroundColor: 'rgba(14,165,233,0.8)', borderRadius: 6 },
        { label: 'Completed', data: months.map(m => counts.completed[m]), backgroundColor: 'rgba(34,197,94,0.8)', borderRadius: 6 },
        { label: 'Cancelled', data: months.map(m => counts.cancelled[m]), backgroundColor: 'rgba(239,68,68,0.8)', borderRadius: 6 },
      ]
    },
    options: chartOptions('Appointments per Month', true)
  });
}

function renderRevenueChart({ months, revenue }) {
  destroyChart('revenue-chart');
  const ctx = document.getElementById('revenue-chart').getContext('2d');
  _charts['revenue-chart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Revenue (₹)',
        data: months.map(m => revenue[m]),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#0ea5e9',
        pointRadius: 5,
      }]
    },
    options: chartOptions('Monthly Revenue (₹)', false)
  });
}

function renderGenderChart(gender) {
  destroyChart('gender-chart');
  const ctx = document.getElementById('gender-chart').getContext('2d');
  _charts['gender-chart'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Male', 'Female', 'Other'],
      datasets: [{
        data: [gender.Male, gender.Female, gender.Other],
        backgroundColor: ['rgba(14,165,233,0.85)', 'rgba(236,72,153,0.85)', 'rgba(168,85,247,0.85)'],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
        title: { display: true, text: 'Patient Gender Distribution', font: { size: 14, weight: '700' }, padding: { bottom: 16 } }
      },
      cutout: '65%',
    }
  });
}

function renderTopDoctorsChart(doctors) {
  destroyChart('doctors-chart');
  const ctx = document.getElementById('doctors-chart').getContext('2d');
  _charts['doctors-chart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: doctors.map(d => d.name),
      datasets: [{
        label: 'Appointments',
        data: doctors.map(d => d.count),
        backgroundColor: [
          'rgba(14,165,233,0.85)','rgba(34,197,94,0.85)','rgba(245,158,11,0.85)',
          'rgba(168,85,247,0.85)','rgba(239,68,68,0.85)','rgba(20,184,166,0.85)'
        ],
        borderRadius: 6,
      }]
    },
    options: { ...chartOptions('Top Doctors by Appointments', false), indexAxis: 'y' }
  });
}

function renderSummaryCards(patients, revenue, pending) {
  document.getElementById('r-stat-patients').textContent = patients;
  document.getElementById('r-stat-revenue').textContent = '₹' + Math.round(revenue).toLocaleString('en-IN');
  document.getElementById('r-stat-pending').textContent = '₹' + Math.round(pending).toLocaleString('en-IN');
}

// ── Helpers ────────────────────────────────────────────────

function getLast6Months() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthLabel(d.toISOString().slice(0, 7)));
  }
  return months;
}

function monthLabel(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(m) - 1]} ${y}`;
}

function chartOptions(title, stacked = false) {
  return {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
      title: { display: true, text: title, font: { size: 14, weight: '700' }, padding: { bottom: 16 } }
    },
    scales: {
      x: { stacked, grid: { display: false } },
      y: { stacked, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
    }
  };
}
