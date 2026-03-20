// prescription.js v8 — Medicine autocomplete from pharmacy stock

let rxMedicines  = [];
let _pharmCache  = null;

// Load pharmacy medicines for autocomplete
async function getPharmacyMeds() {
  if (_pharmCache) return _pharmCache;
  const { data } = await sb.from('pharmacy_inventory')
    .select('id, medicine_name, generic_name, unit_price, stock_quantity, category')
    .gt('stock_quantity', 0)
    .order('medicine_name');
  _pharmCache = data || [];
  return _pharmCache;
}

function findMedPrice(name) {
  if (!_pharmCache || !name) return null;
  const n = name.toLowerCase().trim();
  return _pharmCache.find(m =>
    m.medicine_name.toLowerCase().includes(n) ||
    n.includes(m.medicine_name.toLowerCase().split(' ')[0])
  ) || null;
}

// ── Prescription List ──────────────────────────────────────
async function loadPrescriptions() {
  const tbody = document.getElementById('rx-tbody');
  if (!tbody) return;
  const cacheKey = 'rx_list';
  let data = Cache.get(cacheKey);

  if (!data) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">
      <div class="spinner" style="margin:0 auto 10px"></div>Loading...
    </td></tr>`;
    const res = await sb.from('prescriptions')
      .select('id, diagnosis, rx_date, created_at, medicines, patients(name), doctors(name, specialization)')
      .order('created_at', { ascending: false });
    if (res.error) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:var(--danger)">⚠ ${res.error.message}</td></tr>`;
      return;
    }
    data = res.data || [];
    Cache.set(cacheKey, data);
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">
      <div style="font-size:36px;margin-bottom:8px">💊</div>No prescriptions yet
    </td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(rx => {
    const meds = Array.isArray(rx.medicines) ? rx.medicines : [];
    return `<tr>
      <td><strong>${rx.patients?.name || '—'}</strong></td>
      <td>
        <div style="font-weight:600">${rx.doctors?.name || '—'}</div>
        <div style="font-size:11px;color:var(--muted)">${rx.doctors?.specialization || ''}</div>
      </td>
      <td>${rx.diagnosis || '<span style="color:var(--muted)">—</span>'}</td>
      <td>
        <span class="badge badge-scheduled" style="font-size:11px">
          ${meds.length} Medicine${meds.length !== 1 ? 's' : ''}
        </span>
      </td>
      <td>${formatDate(rx.rx_date || rx.created_at)}</td>
      <td><span class="badge badge-completed">Issued</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn-icon" onclick="openBillFromRx('${rx.id}')" title="Generate Bill"
          style="background:var(--success-bg);color:var(--success);font-size:15px">💰</button>
        <button class="btn-icon" onclick="printPrescription('${rx.id}')" title="Print">🖨️</button>
        <button class="btn-icon" onclick="deleteRx('${rx.id}')" title="Delete">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ── Open Rx Builder ────────────────────────────────────────
async function openRxBuilder() {
  rxMedicines = [{ name: '', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days' }];

  // Preload pharmacy meds for autocomplete
  await getPharmacyMeds();

  await populateDropdown('rx-patient', 'patients', 'name');
  await populateDropdown('rx-doctor',  'doctors',  'name');

  document.getElementById('rx-diagnosis').value = '';
  document.getElementById('rx-notes').value     = '';
  document.getElementById('rx-date').value      = new Date().toISOString().slice(0,10);

  renderRxMedRows();
  openModal('rx-modal');
}

// ── Render Medicine Rows with Autocomplete ─────────────────
function renderRxMedRows() {
  const container = document.getElementById('rx-med-rows');
  if (!container) return;

  const FREQ = [
    'Once daily','Twice daily','Thrice daily',
    'Four times daily','Before meals','After meals',
    'At bedtime','SOS (as needed)'
  ];

  // Build medicine datalist from pharmacy stock
  const meds = _pharmCache || [];
  const datalistHtml = `<datalist id="pharmacy-meds-list">
    ${meds.map(m => `<option value="${m.medicine_name}" data-price="${m.unit_price}" data-stock="${m.stock_quantity}">${m.medicine_name} — ₹${m.unit_price} (Stock: ${m.stock_quantity})</option>`).join('')}
  </datalist>`;

  let tableHtml = `
  <table style="width:100%;border-collapse:collapse;border:1.5px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:10px;font-size:12.5px">
    <thead><tr style="background:#f8fafd">
      <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);border-bottom:1px solid var(--border)">Medicine (from stock)</th>
      <th style="padding:9px 12px;width:90px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);border-bottom:1px solid var(--border)">Dosage</th>
      <th style="padding:9px 12px;width:140px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);border-bottom:1px solid var(--border)">Frequency</th>
      <th style="padding:9px 12px;width:80px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);border-bottom:1px solid var(--border)">Duration</th>
      <th style="padding:9px 12px;width:70px;text-align:right;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);border-bottom:1px solid var(--border)">Price</th>
      <th style="border-bottom:1px solid var(--border);width:34px"></th>
    </tr></thead>
    <tbody>`;

  rxMedicines.forEach((m, i) => {
    const found = findMedPrice(m.name);
    const priceText = found ? `₹${found.unit_price}` : (m.name ? '<span style="color:var(--warning);font-size:10px">Not in stock</span>' : '—');

    tableHtml += `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:7px 8px">
        <input type="text" list="pharmacy-meds-list" placeholder="Type medicine name..." value="${m.name}"
          style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:7px;font-family:inherit;font-size:12.5px;color:var(--text);background:var(--card);outline:none"
          onchange="rxMedicines[${i}].name=this.value;renderRxMedRows()"
          oninput="rxMedicines[${i}].name=this.value"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"/>
      </td>
      <td style="padding:7px 6px">
        <input type="text" placeholder="1 tab" value="${m.dosage}"
          style="width:100%;padding:7px 8px;border:1.5px solid var(--border);border-radius:7px;font-family:inherit;font-size:12px;color:var(--text);background:var(--card);outline:none"
          onchange="rxMedicines[${i}].dosage=this.value"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"/>
      </td>
      <td style="padding:7px 6px">
        <select style="width:100%;padding:7px 8px;border:1.5px solid var(--border);border-radius:7px;font-family:inherit;font-size:12px;color:var(--text);background:var(--card);outline:none"
          onchange="rxMedicines[${i}].frequency=this.value">
          ${FREQ.map(f => `<option ${m.frequency===f?'selected':''}>${f}</option>`).join('')}
        </select>
      </td>
      <td style="padding:7px 6px">
        <input type="text" placeholder="5 days" value="${m.duration}"
          style="width:100%;padding:7px 8px;border:1.5px solid var(--border);border-radius:7px;font-family:inherit;font-size:12px;color:var(--text);background:var(--card);outline:none"
          onchange="rxMedicines[${i}].duration=this.value"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"/>
      </td>
      <td style="padding:7px 6px;text-align:right;font-size:12px;font-weight:700">${priceText}</td>
      <td style="padding:7px 6px;text-align:center">
        <button onclick="removeRxMed(${i})"
          style="width:28px;height:28px;background:var(--danger-bg);color:var(--danger);border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">×</button>
      </td>
    </tr>`;
  });

  tableHtml += `</tbody></table>`;

  // Total cost preview
  const totalCost = rxMedicines.reduce((sum, m) => {
    const found = findMedPrice(m.name);
    if (!found) return sum;
    const days  = parseInt(m.duration) || 1;
    const perDay= m.frequency.includes('Four')?4:m.frequency.includes('Three')||m.frequency.includes('Thrice')?3:m.frequency.includes('Twice')||m.frequency.includes('Two')?2:1;
    return sum + (found.unit_price * Math.max(1, perDay * days));
  }, 0);

  const costHtml = totalCost > 0 ? `
    <div style="background:var(--accent-light);border:1px solid rgba(25,118,210,0.15);border-radius:8px;padding:10px 14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12.5px;color:var(--muted)">Estimated Medicine Cost</span>
      <span style="font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:var(--accent)">₹${totalCost.toLocaleString('en-IN')}</span>
    </div>` : '';

  const addBtn = `<button onclick="addRxMed()"
    style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:var(--accent-light);color:var(--accent);border:1.5px dashed var(--accent);border-radius:7px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">
    + Add Medicine
  </button>`;

  container.innerHTML = datalistHtml + tableHtml + costHtml + addBtn;
}

function addRxMed() {
  rxMedicines.push({ name:'', dosage:'1 tablet', frequency:'Twice daily', duration:'5 days' });
  renderRxMedRows();
}

function removeRxMed(i) {
  if (rxMedicines.length === 1) return showToast('At least one medicine required','error');
  rxMedicines.splice(i,1);
  renderRxMedRows();
}

// ── Save Prescription ──────────────────────────────────────
async function saveRx() {
  const patientId = document.getElementById('rx-patient').value;
  const doctorId  = document.getElementById('rx-doctor').value;
  if (!patientId) return showToast('Select a patient','error');
  if (!doctorId)  return showToast('Select a doctor','error');
  const meds = rxMedicines.filter(m => m.name.trim());
  if (!meds.length) return showToast('Add at least one medicine','error');

  const payload = {
    patient_id: patientId,
    doctor_id:  doctorId,
    diagnosis:  document.getElementById('rx-diagnosis').value.trim(),
    notes:      document.getElementById('rx-notes').value.trim(),
    medicines:  meds,
    rx_date:    document.getElementById('rx-date').value,
  };

  const { data, error } = await sb.from('prescriptions').insert(payload).select().single();
  if (error) return showToast('Save failed: ' + error.message,'error');

  Cache.invalidate('rx_list');
  showToast('Prescription saved! 💊','success');
  closeModal('rx-modal');
  loadPrescriptions();

  setTimeout(() => {
    if (confirm('Generate bill from this prescription now?')) openBillFromRx(data.id);
  }, 400);
}

// ── Bill from Rx ───────────────────────────────────────────
async function openBillFromRx(rxId) {
  const { data: rx, error } = await sb.from('prescriptions')
    .select('*, patients(name,id), doctors(name,fee)')
    .eq('id', rxId).single();
  if (error || !rx) return showToast('Prescription not found','error');

  const meds   = Array.isArray(rx.medicines) ? rx.medicines : [];
  const prices = await getPharmacyMeds();

  const lineItems = meds.map(m => {
    const found  = findMedPrice(m.name);
    const days   = parseInt(m.duration)||1;
    const perDay = m.frequency?.includes('Four')?4:m.frequency?.includes('Thrice')||m.frequency?.includes('Three')?3:m.frequency?.includes('Twice')?2:1;
    const qty    = Math.max(1, perDay * days);
    return {
      name: m.name, dosage: m.dosage||'', freq: m.frequency||'', duration: m.duration||'',
      qty, unit_price: found?.unit_price||0, found: !!found, med_id: found?.id||null,
    };
  });

  const consultFee = rx.doctors?.fee || 0;
  const medTotal   = lineItems.reduce((s,i) => s + (i.unit_price*i.qty),0);
  const grandTotal = consultFee + medTotal;

  const previewHtml = `
    <div class="rx-bill-preview">
      <div class="rx-bill-header">
        <div>
          <div class="rx-bill-header-title">🧾 Auto Bill Preview</div>
          <div class="rx-bill-header-sub">Patient: ${rx.patients?.name||'—'} · Dr. ${rx.doctors?.name||'—'}</div>
        </div>
        <div style="text-align:right;color:rgba(255,255,255,0.7);font-size:11px">${formatDate(rx.rx_date||rx.created_at)}</div>
      </div>
      <table class="rx-bill-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
        <tbody>
          ${consultFee > 0 ? `<tr>
            <td><strong>Consultation Fee</strong><div style="font-size:11px;color:var(--muted)">Dr. ${rx.doctors?.name||''}</div></td>
            <td>1</td><td>₹${consultFee.toLocaleString('en-IN')}</td>
            <td><strong>₹${consultFee.toLocaleString('en-IN')}</strong></td>
          </tr>` : ''}
          ${lineItems.map(i => `<tr>
            <td>
              <strong>${i.name}</strong>
              ${!i.found ? '<span class="med-not-found">⚠ Not in pharmacy</span>' : ''}
              <div style="font-size:11px;color:var(--muted)">${i.dosage} · ${i.freq} · ${i.duration}</div>
            </td>
            <td>${i.qty}</td>
            <td>${i.found ? '₹'+i.unit_price.toLocaleString('en-IN') : '—'}</td>
            <td><strong>${i.found ? '₹'+(i.unit_price*i.qty).toLocaleString('en-IN') : '—'}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="rx-bill-total-row">
        <span class="rx-bill-total-label">Total Amount</span>
        <span class="rx-bill-total-amount">₹${grandTotal.toLocaleString('en-IN')}</span>
      </div>
    </div>`;

  document.getElementById('rxbill-rx-id').value      = rxId;
  document.getElementById('rxbill-patient-id').value = rx.patient_id;
  document.getElementById('rxbill-total').value      = grandTotal;
  document.getElementById('rxbill-items-json').value = JSON.stringify([
    ...(consultFee>0?[{description:`Consultation — Dr. ${rx.doctors?.name}`,amount:consultFee,qty:1}]:[]),
    ...lineItems.filter(i=>i.found).map(i=>({
      description:`${i.name} × ${i.qty}`, amount:i.unit_price*i.qty, qty:i.qty, unit_price:i.unit_price
    }))
  ]);
  document.getElementById('rxbill-preview').innerHTML = previewHtml;
  document.getElementById('rxbill-total-display').textContent = '₹'+grandTotal.toLocaleString('en-IN');
  document.getElementById('rxbill-method').value = '';

  openModal('rxbill-modal');
}

function selectPayMethod(method, btn) {
  document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('rxbill-method').value = method;
}

async function saveBillFromRx() {
  const rxId      = document.getElementById('rxbill-rx-id').value;
  const patientId = document.getElementById('rxbill-patient-id').value;
  const total     = parseFloat(document.getElementById('rxbill-total').value)||0;
  const method    = document.getElementById('rxbill-method').value;
  const paid      = document.getElementById('rxbill-paid-now')?.checked ? total : 0;
  let items = [];
  try { items = JSON.parse(document.getElementById('rxbill-items-json').value||'[]'); } catch(e){}

  const { error } = await sb.from('billing').insert({
    patient_id:     patientId,
    total_amount:   total,
    paid_amount:    paid,
    payment_method: method||null,
    payment_status: paid>=total?'paid':paid>0?'partial':'pending',
    items,
    notes:`Auto-generated from Prescription #${rxId.slice(0,8).toUpperCase()}`,
  });

  if (error) return showToast('Bill creation failed: '+error.message,'error');
  Cache.invalidate('billing_list');
  closeModal('rxbill-modal');
  showToast(`💰 Bill of ₹${total.toLocaleString('en-IN')} created!`,'success');
  showSection('billing');
}

async function deleteRx(id) {
  if (!confirm('Delete this prescription?')) return;
  await sb.from('prescriptions').delete().eq('id', id);
  Cache.invalidate('rx_list');
  showToast('Prescription deleted','success');
  loadPrescriptions();
}

// ── Print ──────────────────────────────────────────────────
async function printPrescription(rxId) {
  const { data: rx } = await sb.from('prescriptions')
    .select('*, patients(name,dob,gender,phone,blood_group), doctors(name,specialization,phone)')
    .eq('id', rxId).single();
  if (!rx) return showToast('Could not load prescription','error');

  const meds   = Array.isArray(rx.medicines)?rx.medicines:[];
  const dob    = rx.patients?.dob;
  const age    = dob ? Math.floor((Date.now()-new Date(dob))/3.156e10) : '—';
  const dateStr= new Date(rx.rx_date||rx.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});

  const win = window.open('','_blank','width=820,height=960');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Rx — ${rx.patients?.name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2535;padding:36px;background:#fff}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #1976d2;margin-bottom:18px}
  .h-name{font-size:22px;font-weight:800;color:#0a192f}.h-sub{font-size:12px;color:#64748b;margin-top:3px}
  .doc-name{font-size:15px;font-weight:800;color:#1976d2}.doc-sub{font-size:12px;color:#64748b;margin-top:2px}
  .rx-id{font-size:10px;color:#94a3b8;font-family:monospace;margin-top:4px}
  .pat-box{background:#f0f7ff;border-radius:10px;padding:14px 18px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px 20px;margin-bottom:18px}
  .f label{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;display:block;margin-bottom:2px}
  .f span{font-size:13.5px;font-weight:600}
  .rx-sym{font-size:44px;font-weight:900;color:#1976d2;font-style:italic;margin-bottom:10px;line-height:1}
  .diag{margin-bottom:14px}.diag label{font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;display:block;margin-bottom:4px}
  .diag p{font-size:14px;font-weight:600}
  table{width:100%;border-collapse:collapse}
  thead th{background:#f0f7ff;padding:9px 13px;font-size:11px;font-weight:800;text-transform:uppercase;color:#1565c0;text-align:left;border-bottom:2px solid #bfdbfe}
  tbody tr{border-bottom:1px solid #f1f5f9}tbody td{padding:11px 13px;font-size:13px}
  .notes{margin-top:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 15px}
  .notes label{font-size:10.5px;font-weight:800;text-transform:uppercase;color:#b45309;display:block;margin-bottom:4px}
  .footer{margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end;padding-top:14px;border-top:1px solid #e2e8f0}
  .sign{text-align:center}.sign-line{border-top:1px solid #1e293b;width:180px;margin:0 auto 6px}.sign-label{font-size:11px;color:#64748b}
  @media print{button{display:none!important}body{padding:20px}}
</style></head><body>
<div class="hdr">
  <div><div class="h-name">🏥 MediCare Hospital</div><div class="h-sub">Quality Healthcare · Always</div></div>
  <div style="text-align:right">
    <div class="doc-name">Dr. ${rx.doctors?.name||'—'}</div>
    <div class="doc-sub">${rx.doctors?.specialization||''}</div>
    <div class="doc-sub">${rx.doctors?.phone||''}</div>
    <div class="rx-id">RX/${rx.id.slice(0,8).toUpperCase()}</div>
    <div class="doc-sub" style="margin-top:4px">Date: ${dateStr}</div>
  </div>
</div>
<div class="pat-box">
  <div class="f"><label>Patient Name</label><span>${rx.patients?.name||'—'}</span></div>
  <div class="f"><label>Age / Gender</label><span>${age} yrs / ${rx.patients?.gender||'—'}</span></div>
  <div class="f"><label>Blood Group</label><span>${rx.patients?.blood_group||'—'}</span></div>
  <div class="f"><label>Phone</label><span>${rx.patients?.phone||'—'}</span></div>
</div>
<div class="rx-sym">℞</div>
${rx.diagnosis?`<div class="diag"><label>Diagnosis</label><p>${rx.diagnosis}</p></div>`:''}
<table>
  <thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
  <tbody>${meds.map((m,i)=>`<tr><td style="color:#94a3b8">${i+1}</td><td><strong>${m.name}</strong></td><td>${m.dosage||'—'}</td><td>${m.frequency||'—'}</td><td>${m.duration||'—'}</td></tr>`).join('')}</tbody>
</table>
${rx.notes?`<div class="notes"><label>⚠ Special Instructions</label><p style="font-size:13px">${rx.notes}</p></div>`:''}
<div class="footer">
  <div style="font-size:11px;color:#94a3b8">Valid for 30 days from date of issue</div>
  <div class="sign"><div class="sign-line"></div><div class="sign-label">Doctor's Signature & Stamp</div></div>
</div>
<div style="text-align:center;margin-top:22px">
  <button onclick="window.print()" style="padding:10px 26px;background:#1976d2;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px">🖨️ Print</button>
  <button onclick="window.close()" style="padding:10px 18px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;cursor:pointer">Close</button>
</div>
</body></html>`);
  win.document.close();
}
