// print.js — Bill Print & PDF Generation

async function printBill(billId) {
  // Fetch bill with patient info
  const { data: bill, error } = await sb
    .from('billing')
    .select('*, patients(name, phone, email, address, blood_group)')
    .eq('id', billId)
    .single();

  if (error || !bill) return showToast('Could not load bill for printing', 'error');

  const items = Array.isArray(bill.items) ? bill.items : [];
  const due = (bill.total_amount || 0) - (bill.paid_amount || 0);
  const date = new Date(bill.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const itemsHTML = items.length
    ? items.map((it, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.description || '—'}</td>
          <td style="text-align:right">₹${(it.amount || 0).toLocaleString('en-IN')}</td>
        </tr>`).join('')
    : `<tr><td>1</td><td>Medical Services</td><td style="text-align:right">₹${(bill.total_amount||0).toLocaleString('en-IN')}</td></tr>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Bill — ${bill.patients?.name || 'Patient'}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:3px solid #0ea5e9; }
    .hospital-name { font-size:26px; font-weight:800; color:#0a1628; letter-spacing:-0.5px; }
    .hospital-sub  { font-size:13px; color:#64748b; margin-top:4px; }
    .bill-meta { text-align:right; }
    .bill-meta h2 { font-size:20px; font-weight:700; color:#0ea5e9; }
    .bill-meta p { font-size:12px; color:#64748b; margin-top:4px; }
    .bill-id { font-size:11px; color:#94a3b8; font-family:monospace; }
    .section { margin-top:28px; }
    .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; margin-bottom:10px; }
    .patient-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 20px; }
    .patient-grid .field label { font-size:11px; color:#94a3b8; display:block; }
    .patient-grid .field span { font-size:14px; font-weight:500; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    thead th { background:#f0f9ff; padding:10px 14px; text-align:left; font-size:12px; font-weight:700; color:#0369a1; }
    tbody td { padding:10px 14px; border-bottom:1px solid #f1f5f9; font-size:13.5px; }
    .totals { margin-top:16px; display:flex; justify-content:flex-end; }
    .totals-box { min-width:260px; }
    .total-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13.5px; }
    .total-row.grand { font-size:16px; font-weight:800; border-bottom:none; padding-top:12px; color:#0a1628; }
    .total-row.due { color:${due > 0 ? '#ef4444' : '#22c55e'}; font-weight:700; }
    .status-badge { display:inline-block; padding:4px 14px; border-radius:20px; font-size:12px; font-weight:700; text-transform:uppercase;
      background:${bill.payment_status==='paid'?'#dcfce7':bill.payment_status==='partial'?'#fef9c3':'#fee2e2'};
      color:${bill.payment_status==='paid'?'#166534':bill.payment_status==='partial'?'#854d0e':'#991b1b'}; }
    .footer { margin-top:48px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; }
    .sign-box { text-align:center; margin-top:60px; }
    .sign-line { border-top:1px solid #1e293b; width:180px; margin:0 auto 6px; }
    .sign-label { font-size:11px; color:#64748b; }
    @media print {
      body { padding:20px; }
      button { display:none !important; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="hospital-name">🏥 MediCare Hospital</div>
      <div class="hospital-sub">A Complete Healthcare Solution</div>
    </div>
    <div class="bill-meta">
      <h2>INVOICE</h2>
      <p>Date: ${date}</p>
      <p class="bill-id">ID: ${bill.id.slice(0,8).toUpperCase()}</p>
      <div style="margin-top:8px"><span class="status-badge">${bill.payment_status}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Patient Details</div>
    <div class="patient-grid">
      <div class="field"><label>Name</label><span>${bill.patients?.name || '—'}</span></div>
      <div class="field"><label>Phone</label><span>${bill.patients?.phone || '—'}</span></div>
      <div class="field"><label>Email</label><span>${bill.patients?.email || '—'}</span></div>
      <div class="field"><label>Blood Group</label><span>${bill.patients?.blood_group || '—'}</span></div>
      ${bill.patients?.address ? `<div class="field" style="grid-column:1/-1"><label>Address</label><span>${bill.patients.address}</span></div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill Items</div>
    <table>
      <thead><tr><th>#</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${itemsHTML}</tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Total Amount</span><span>₹${(bill.total_amount||0).toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Paid</span><span>₹${(bill.paid_amount||0).toLocaleString('en-IN')}</span></div>
      ${bill.payment_method ? `<div class="total-row"><span>Payment Method</span><span>${bill.payment_method}</span></div>` : ''}
      <div class="total-row due grand"><span>Balance Due</span><span>₹${due.toLocaleString('en-IN')}</span></div>
    </div>
  </div>

  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-label">Authorized Signature</div>
  </div>

  <div class="footer">
    <span>Thank you for choosing MediCare Hospital</span>
    <span>Generated on ${new Date().toLocaleString('en-IN')}</span>
  </div>

  <div style="text-align:center; margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 28px; background:#0ea5e9; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()" style="padding:10px 20px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; margin-left:10px; cursor:pointer;">Close</button>
  </div>

</body>
</html>`);
  win.document.close();
}
