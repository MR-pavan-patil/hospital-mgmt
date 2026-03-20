// pharmacy.js v5 — Card Grid + CSV Import + Dispense → Auto Bill

let allMeds = [];

const MED_FALLBACK = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e0f2fe"/><text x="50" y="62" font-size="42" text-anchor="middle">💊</text></svg>';

async function loadPharmacy(search = '') {
  const cacheKey = 'pharmacy_list';
  let data;
  if (!search) data = Cache.get(cacheKey);
  if (!data) {
    let q = sb.from('pharmacy_inventory').select('*').order('medicine_name');
    if (search) q = q.ilike('medicine_name', `%${search}%`);
    const res = await q;
    if (res.error) return showToast('Error loading pharmacy', 'error');
    data = res.data || [];
    if (!search) Cache.set(cacheKey, data);
  }
  allMeds = data;
  // Update low stock count badge
  const lowCount = allMeds.filter(m => m.stock_quantity < 10 || (m.expiry_date && new Date(m.expiry_date) < new Date())).length;
  const badge = document.getElementById('pharmacy-low-count');
  if (badge) { badge.textContent = lowCount; badge.style.display = lowCount > 0 ? 'inline' : 'none'; }
  renderPharmacyCards(allMeds);
}

function renderPharmacyCards(meds) {
  const grid = document.getElementById('pharmacy-grid');
  if (!grid) return;
  if (!meds.length) {
    grid.innerHTML = `<div class="med-grid-empty"><div class="empty-icon">💊</div><p>No medicines found</p></div>`;
    return;
  }
  const now = new Date();
  grid.innerHTML = meds.map(m => {
    const low     = m.stock_quantity < 10;
    const expired = m.expiry_date && new Date(m.expiry_date) < now;
    const stockBadge = expired ? 'exp' : (m.stock_quantity === 0 ? 'out' : low ? 'low' : 'ok');
    const stockLabel = expired ? '⚠ Expired' : (m.stock_quantity === 0 ? 'Out of Stock' : low ? 'Low Stock' : 'In Stock');
    const imgSrc = m.image_url || MED_FALLBACK;
    return `
    <div class="med-card">
      <div class="med-card-img">
        <img src="${imgSrc}" alt="${m.medicine_name}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
          onload="this.nextElementSibling.style.display='none';" />
        <div class="med-img-fallback" style="display:none">💊</div>
        <span class="med-stock-badge ${stockBadge}">${stockLabel}</span>
      </div>
      <div class="med-card-body">
        <div class="med-cat-tag">${m.category || 'General'}</div>
        <div class="med-name">${m.medicine_name}</div>
        <div class="med-generic">${m.generic_name || m.manufacturer || '—'}</div>
        <div class="med-stats">
          <div class="med-stat">
            <div class="med-stat-label">Stock</div>
            <div class="med-stat-value ${low ? 'text-danger' : ''}">${m.stock_quantity}</div>
          </div>
          <div class="med-stat">
            <div class="med-stat-label">Price</div>
            <div class="med-stat-value">₹${(m.unit_price||0).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div class="med-expiry ${expired ? 'expired' : ''}">📅 Exp: ${formatDate(m.expiry_date)}${expired?' ⚠️':''}</div>
        <div class="med-card-actions">
          ${m.stock_quantity > 0 && !expired ? `<button class="med-btn" style="background:rgba(16,185,129,0.1);color:#059669;flex:1.2" onclick="openDispenseModal('${m.id}')">💊 Dispense</button>` : ''}
          ${canDo('edit','pharmacy')   ? `<button class="med-btn edit" onclick="openMedModal('${m.id}')">✏</button>` : ''}
          ${canDo('delete','pharmacy') ? `<button class="med-btn del"  onclick="deleteMed('${m.id}')">🗑</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Dispense Modal ─────────────────────────────────────────
let _dispenseMed = null;

async function openDispenseModal(medId) {
  _dispenseMed = allMeds.find(m => m.id === medId);
  if (!_dispenseMed) return;

  await populateDropdown('dispense-patient', 'patients', 'name');

  document.getElementById('dispense-med-name').textContent = _dispenseMed.medicine_name;
  document.getElementById('dispense-med-info').textContent =
    `${_dispenseMed.generic_name || ''} · Stock: ${_dispenseMed.stock_quantity} · ₹${_dispenseMed.unit_price}/unit`;
  document.getElementById('dispense-qty').value  = 1;
  document.getElementById('dispense-qty').max    = _dispenseMed.stock_quantity;
  document.getElementById('dispense-auto-bill').checked = true;

  updateDispenseCalc();
  openModal('dispense-modal');
}

function updateDispenseCalc() {
  if (!_dispenseMed) return;
  const qty   = parseInt(document.getElementById('dispense-qty')?.value) || 1;
  const price = _dispenseMed.unit_price || 0;
  const total = qty * price;
  const totalEl = document.getElementById('dispense-total');
  const unitEl  = document.getElementById('dispense-unit-price');
  const qtyEl   = document.getElementById('dispense-qty-display');
  if (totalEl) totalEl.textContent = '₹' + total.toLocaleString('en-IN');
  if (unitEl)  unitEl.textContent  = '₹' + price.toLocaleString('en-IN');
  if (qtyEl)   qtyEl.textContent   = qty;
}

async function saveDispense() {
  if (!_dispenseMed) return;
  const patientId  = document.getElementById('dispense-patient').value;
  const qty        = parseInt(document.getElementById('dispense-qty').value) || 1;
  const autoBill   = document.getElementById('dispense-auto-bill')?.checked;
  const notes      = document.getElementById('dispense-notes')?.value?.trim() || '';

  if (!patientId) return showToast('Please select a patient', 'error');
  if (qty < 1)    return showToast('Quantity must be at least 1', 'error');
  if (qty > _dispenseMed.stock_quantity) return showToast(`Only ${_dispenseMed.stock_quantity} units available`, 'error');

  // 1. Reduce stock
  const newStock = _dispenseMed.stock_quantity - qty;
  const { error: stockErr } = await sb.from('pharmacy_inventory')
    .update({ stock_quantity: newStock })
    .eq('id', _dispenseMed.id);
  if (stockErr) return showToast('Stock update failed: ' + stockErr.message, 'error');

  // 2. Auto-create bill if checked
  if (autoBill) {
    const total = qty * (_dispenseMed.unit_price || 0);
    const billPayload = {
      patient_id:     patientId,
      total_amount:   total,
      paid_amount:    0,
      payment_status: 'pending',
      items: [{
        description: `${_dispenseMed.medicine_name} × ${qty}`,
        amount: total,
        qty,
        unit_price: _dispenseMed.unit_price,
      }],
      notes: notes || `Pharmacy dispense: ${_dispenseMed.medicine_name}`,
    };
    const { error: billErr } = await sb.from('billing').insert(billPayload);
    if (billErr) showToast('Bill creation failed: ' + billErr.message, 'error');
    else showToast(`💊 ${qty} units dispensed · Bill of ₹${total.toLocaleString('en-IN')} created!`, 'success');
  } else {
    showToast(`💊 ${qty} units of ${_dispenseMed.medicine_name} dispensed. Stock: ${newStock}`, 'success');
  }

  Cache.invalidate('pharmacy_list');
  Cache.invalidate('billing_list');
  closeModal('dispense-modal');
  loadPharmacy();
}

// ── Edit / Save / Delete ───────────────────────────────────
function openMedModal(id = null) {
  const m = id ? allMeds.find(x => x.id === id) : null;
  document.getElementById('med-modal-title').textContent = m ? 'Edit Medicine' : 'Add Medicine';
  document.getElementById('med-id').value           = m?.id || '';
  document.getElementById('med-name').value         = m?.medicine_name || '';
  document.getElementById('med-generic').value      = m?.generic_name  || '';
  document.getElementById('med-category').value     = m?.category      || '';
  document.getElementById('med-manufacturer').value = m?.manufacturer  || '';
  document.getElementById('med-stock').value        = m?.stock_quantity ?? '';
  document.getElementById('med-price').value        = m?.unit_price    ?? '';
  document.getElementById('med-expiry').value       = m?.expiry_date   || '';
  document.getElementById('med-image').value        = m?.image_url     || '';
  document.getElementById('med-desc').value         = m?.description   || '';
  openModal('med-modal');
}

async function saveMed() {
  const id = document.getElementById('med-id').value;
  const payload = {
    medicine_name:  document.getElementById('med-name').value.trim(),
    generic_name:   document.getElementById('med-generic').value.trim(),
    category:       document.getElementById('med-category').value.trim(),
    stock_quantity: parseInt(document.getElementById('med-stock').value)  || 0,
    unit_price:     parseFloat(document.getElementById('med-price').value) || 0,
    manufacturer:   document.getElementById('med-manufacturer').value.trim(),
    expiry_date:    document.getElementById('med-expiry').value || null,
    image_url:      document.getElementById('med-image').value.trim() || null,
    description:    document.getElementById('med-desc').value.trim(),
  };
  if (!payload.medicine_name) return showToast('Medicine name required', 'error');
  let error;
  if (id) ({ error } = await sb.from('pharmacy_inventory').update(payload).eq('id', id));
  else    ({ error } = await sb.from('pharmacy_inventory').insert(payload));
  if (error) return showToast('Save failed: ' + error.message, 'error');
  Cache.invalidate('pharmacy_list');
  showToast('Medicine saved! 💊', 'success');
  closeModal('med-modal'); loadPharmacy();
}

async function deleteMed(id) {
  if (!confirm('Delete this medicine?')) return;
  const { error } = await sb.from('pharmacy_inventory').delete().eq('id', id);
  if (error) return showToast('Delete failed', 'error');
  Cache.invalidate('pharmacy_list');
  showToast('Medicine deleted', 'success'); loadPharmacy();
}

// ── CSV Import ─────────────────────────────────────────────
function triggerCSVImport() { document.getElementById('csv-file-input').click(); }

async function handleCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  showToast('Reading CSV...', 'success');
  const text = await file.text();
  const rows = parseCSV(text);
  if (!rows.length) return showToast('No valid rows found', 'error');

  let imported = 0, failed = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const { error } = await sb.from('pharmacy_inventory').insert(batch);
    if (error) failed += batch.length; else imported += batch.length;
  }
  Cache.invalidate('pharmacy_list');
  event.target.value = '';
  if (imported > 0) showToast(`✅ ${imported} medicines imported!`, 'success');
  if (failed > 0)   showToast(`⚠ ${failed} rows failed`, 'error');
  loadPharmacy();
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else cur += line[i];
    }
    values.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]?.replace(/^"|"$/g, '') || '');
    return {
      medicine_name:  obj.medicine_name || null,
      generic_name:   obj.generic_name  || null,
      category:       obj.category      || 'General',
      stock_quantity: parseInt(obj.stock_quantity || 0) || 0,
      unit_price:     parseFloat(obj.unit_price || 0)   || 0,
      manufacturer:   obj.manufacturer  || null,
      expiry_date:    obj.expiry_date   || null,
      image_url:      obj.image_url     || null,
      description:    obj.description   || null,
    };
  }).filter(r => r.medicine_name);
}
