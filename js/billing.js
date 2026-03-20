// billing.js v7-fixed

let allBills   = [];
let billItems  = [];
let _activeBillTab = 'all';

async function loadBilling(search = '') {
  const tbody = document.getElementById('billing-tbody');
  const cacheKey = 'billing_list';
  let data;

  if (!search) data = Cache.get(cacheKey);

  if (!data) {
    if (tbody && !search) tbody.innerHTML = `<tr><td colspan="7" class="empty-row">
      <div class="spinner" style="margin:0 auto 10px"></div>Loading bills...
    </td></tr>`;

    const res = await sb
      .from('billing')
      .select('id, total_amount, paid_amount, payment_status, payment_method, notes, created_at, patient_id, appointment_id, items, patients(name, phone)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (res.error) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:var(--danger)">⚠ ${res.error.message}</td></tr>`;
      return;
    }
    data = res.data || [];
    if (!search) Cache.set(cacheKey, data);
  }

  allBills = data;

  // Filter by search
  let filtered = allBills;
  if (search) {
    const s = search.toLowerCase();
    filtered = allBills.filter(b => b.patients?.name?.toLowerCase().includes(s));
  }

  // Update tab counts
  const allCount     = filtered.length;
  const pendingCount = filtered.filter(b => b.payment_status !== 'paid').length;
  const paidCount    = filtered.filter(b => b.payment_status === 'paid').length;

  const tc1 = document.getElementById('tab-count-all');
  const tc2 = document.getElementById('tab-count-pending');
  const tc3 = document.getElementById('tab-count-paid');
  if (tc1) tc1.textContent = allCount;
  if (tc2) tc2.textContent = pendingCount;
  if (tc3) tc3.textContent = paidCount;

  // Summary stats
  const totalRevenue = allBills.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const totalPending = allBills.reduce((s, b) => s + Math.max(0, (b.total_amount || 0) - (b.paid_amount || 0)), 0);
  const s1 = document.getElementById('billing-stat-revenue');
  const s2 = document.getElementById('billing-stat-pending');
  const s3 = document.getElementById('billing-stat-count');
  if (s1) s1.textContent = '₹' + Math.round(totalRevenue).toLocaleString('en-IN');
  if (s2) s2.textContent = '₹' + Math.round(totalPending).toLocaleString('en-IN');
  if (s3) s3.textContent = allBills.length;

  filterBillsTab(_activeBillTab, search);
}

function filterBillsTab(tab, search = '') {
  _activeBillTab = tab;
  document.querySelectorAll('.bill-tab').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tab)
  );

  let filtered = allBills;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(b => b.patients?.name?.toLowerCase().includes(s));
  }
  if (tab === 'pending') filtered = filtered.filter(b => b.payment_status !== 'paid');
  if (tab === 'paid')    filtered = filtered.filter(b => b.payment_status === 'paid');
  renderBillingTable(filtered);
}

function renderBillingTable(bills) {
  const tbody = document.getElementById('billing-tbody');
  if (!tbody) return;

  if (!bills.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">
      <div style="font-size:36px;margin-bottom:8px">${_activeBillTab === 'paid' ? '✅' : '🧾'}</div>
      No ${_activeBillTab === 'paid' ? 'paid bills' : _activeBillTab === 'pending' ? 'pending bills' : 'billing records'} found
    </td></tr>`;
    return;
  }

  tbody.innerHTML = bills.map(b => {
    const due = Math.max(0, (b.total_amount || 0) - (b.paid_amount || 0));
    const isPaid = b.payment_status === 'paid';
    const date = new Date(b.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    return `<tr>
      <td>
        <div style="font-weight:700;font-size:13px">${b.patients?.name || '—'}</div>
        ${b.patients?.phone ? `<div style="font-size:11px;color:var(--muted)">${b.patients.phone}</div>` : ''}
        <div style="font-size:10.5px;color:var(--muted);margin-top:2px">📅 ${date}</div>
      </td>
      <td style="font-weight:700;font-size:13.5px">₹${(b.total_amount||0).toLocaleString('en-IN')}</td>
      <td style="font-weight:600;color:var(--success);font-size:13px">₹${(b.paid_amount||0).toLocaleString('en-IN')}</td>
      <td style="font-weight:700;font-size:13px;color:${due > 0 ? 'var(--danger)' : 'var(--success)'}">
        ₹${due.toLocaleString('en-IN')}
      </td>
      <td>${b.payment_method || '<span style="color:var(--muted)">—</span>'}</td>
      <td><span class="badge badge-${b.payment_status}">
        <span class="status-dot dot-${isPaid ? 'green' : b.payment_status === 'partial' ? 'amber' : 'red'}"></span>
        ${b.payment_status}
      </span></td>
      <td>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
          ${!isPaid ? `<button onclick="quickPay('${b.id}')"
            style="background:var(--success-bg);color:var(--success);border:none;cursor:pointer;padding:5px 10px;border-radius:6px;font-family:inherit;font-size:11px;font-weight:800;white-space:nowrap">
            💰 Pay
          </button>` : ''}
          <button class="btn-icon" onclick="printBill('${b.id}')" title="Print">🖨️</button>
          ${actionBtns('billing', b.id, 'openBillModal', 'deleteBill')}
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function quickPay(billId) {
  const bill = allBills.find(b => b.id === billId);
  if (!bill) return;
  const { error } = await sb.from('billing')
    .update({ paid_amount: bill.total_amount, payment_status: 'paid' })
    .eq('id', billId);
  if (error) return showToast('Update failed', 'error');
  Cache.invalidate('billing_list');
  showToast('💰 Bill marked as PAID!', 'success');
  loadBilling();
}

async function openBillModal(id = null) {
  const bill = id ? allBills.find(b => b.id === id) : null;

  await populateDropdown('bill-patient', 'patients', 'name');

  // Load completed appointments for linking
  const { data: appts } = await sb
    .from('appointments')
    .select('id, appointment_date, patients(name), doctors(name)')
    .eq('status', 'completed')
    .order('appointment_date', { ascending: false })
    .limit(40);

  const apptSel = document.getElementById('bill-appointment');
  if (apptSel) {
    apptSel.innerHTML = '<option value="">— No appointment link —</option>' +
      (appts||[]).map(a =>
        `<option value="${a.id}">${a.patients?.name||''} · Dr.${a.doctors?.name||''} · ${formatDate(a.appointment_date)}</option>`
      ).join('');
  }

  document.getElementById('bill-modal-title').textContent = bill ? 'Edit Bill' : 'New Bill';
  document.getElementById('bill-id').value          = bill?.id || '';
  document.getElementById('bill-patient').value     = bill?.patient_id || '';
  if (apptSel) apptSel.value                        = bill?.appointment_id || '';
  document.getElementById('bill-paid').value        = bill?.paid_amount || '';
  document.getElementById('bill-method').value      = bill?.payment_method || '';
  document.getElementById('bill-notes').value       = bill?.notes || '';

  billItems = Array.isArray(bill?.items) && bill.items.length
    ? [...bill.items]
    : [{ description: 'Consultation', amount: 500 }];
  renderBillItems();
  openModal('bill-modal');
}

function renderBillItems() {
  const container = document.getElementById('bill-items-container');
  if (!container) return;

  let html = `<div style="display:grid;grid-template-columns:1fr 100px 32px;gap:6px;margin-bottom:6px;padding:0 2px">
    <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted)">Description</span>
    <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);text-align:right">Amount (₹)</span>
    <span></span>
  </div>`;

  billItems.forEach((item, i) => {
    html += `<div style="display:grid;grid-template-columns:1fr 100px 32px;gap:6px;margin-bottom:6px;align-items:center">
      <input type="text" placeholder="e.g. Consultation, Blood Test..." value="${item.description||''}"
        style="padding:8px 11px;border:1.5px solid var(--border);border-radius:7px;font-family:inherit;font-size:12.5px;color:var(--text);background:var(--card);outline:none;width:100%"
        onchange="billItems[${i}].description=this.value;recalcBill()"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"/>
      <input type="number" placeholder="0" value="${item.amount||''}" min="0"
        style="padding:8px 10px;border:1.5px solid var(--border);border-radius:7px;font-family:inherit;font-size:13px;font-weight:700;color:var(--text);background:var(--card);outline:none;width:100%;text-align:right"
        oninput="billItems[${i}].amount=parseFloat(this.value)||0;recalcBill()"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"/>
      <button onclick="removeBillItem(${i})"
        style="width:32px;height:34px;background:var(--danger-bg);color:var(--danger);border:none;border-radius:7px;cursor:pointer;font-size:16px;font-weight:700">×</button>
    </div>`;
  });

  html += `<button onclick="addBillItem()"
    style="display:inline-flex;align-items:center;gap:5px;padding:7px 13px;background:var(--accent-light);color:var(--accent);border:1.5px dashed var(--accent);border-radius:7px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-top:2px;transition:all 0.15s"
    onmouseover="this.style.background='var(--accent)';this.style.color='#fff'"
    onmouseout="this.style.background='var(--accent-light)';this.style.color='var(--accent)'">
    + Add Item
  </button>`;

  container.innerHTML = html;
  recalcBill();
}

function addBillItem()     { billItems.push({ description: '', amount: 0 }); renderBillItems(); }
function removeBillItem(i) { billItems.splice(i, 1); renderBillItems(); }

function recalcBill() {
  const total  = billItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const paid   = parseFloat(document.getElementById('bill-paid')?.value) || 0;
  const due    = total - paid;

  const totalEl = document.getElementById('bill-total-display');
  const dueEl   = document.getElementById('bill-due-display');
  const statEl  = document.getElementById('bill-status');

  if (totalEl) totalEl.textContent = '₹' + total.toLocaleString('en-IN');
  if (dueEl) {
    dueEl.textContent = '₹' + Math.abs(due).toLocaleString('en-IN') + (due < 0 ? ' (overpaid)' : '');
    dueEl.style.color = due > 0 ? 'var(--danger)' : 'var(--success)';
  }

  let status = 'pending';
  if (paid >= total && total > 0) status = 'paid';
  else if (paid > 0 && total > 0) status = 'partial';
  if (statEl) statEl.value = status;
}

async function saveBill() {
  const id     = document.getElementById('bill-id').value;
  const patId  = document.getElementById('bill-patient').value;
  if (!patId)  return showToast('Please select a patient', 'error');

  const total  = billItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  if (!total)  return showToast('Add at least one item with amount', 'error');

  const paid   = parseFloat(document.getElementById('bill-paid')?.value) || 0;
  const method = document.getElementById('bill-method')?.value || '';
  const notes  = document.getElementById('bill-notes')?.value?.trim() || '';
  const apptEl = document.getElementById('bill-appointment');
  const apptId = apptEl?.value || null;

  let status = 'pending';
  if (paid >= total) status = 'paid';
  else if (paid > 0) status = 'partial';

  const payload = {
    patient_id:     patId,
    appointment_id: apptId || null,
    total_amount:   total,
    paid_amount:    paid,
    payment_method: method || null,
    payment_status: status,
    items:          billItems.filter(i => i.description || i.amount),
    notes:          notes || null,
  };

  let error;
  if (id) ({ error } = await sb.from('billing').update(payload).eq('id', id));
  else    ({ error } = await sb.from('billing').insert(payload));

  if (error) return showToast('Save failed: ' + error.message, 'error');

  Cache.invalidate('billing_list');
  showToast(`Bill saved! Status: ${status} ✓`, 'success');
  closeModal('bill-modal');
  loadBilling();
}

async function deleteBill(id) {
  if (!confirm('Delete this bill?')) return;
  const { error } = await sb.from('billing').delete().eq('id', id);
  if (error) return showToast('Delete failed', 'error');
  Cache.invalidate('billing_list');
  showToast('Bill deleted', 'success');
  loadBilling();
}
