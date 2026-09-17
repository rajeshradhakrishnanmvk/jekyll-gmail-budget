// Freelancer Cashflow Forecast — client-side app (no external APIs)
// Features: manual invoice entry, CSV import/export, localStorage persistence,
// and a 6-month cashflow forecast based on invoice due dates.

const STORAGE_KEY = 'fgb_invoices_v1';

function $(id){ return document.getElementById(id); }

function init(){
  // wire up buttons
  $('add-invoice').addEventListener('click', addInvoice);
  $('export-csv').addEventListener('click', exportCSV);
  $('import-csv').addEventListener('click', ()=> $('csv-file').click());
  $('csv-file').addEventListener('change', handleCSVFile);
  $('clear-data').addEventListener('click', clearData);
  renderInvoices();
  renderForecast();
}

window.addEventListener('load', init);

function loadInvoices(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): [] }catch(e){ return [] }
}

function saveInvoices(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

function addInvoice(){
  const client = $('client').value.trim();
  const amount = parseFloat(($('amount').value||'').replace(/,/g,''));
  const currency = $('currency').value.trim() || 'USD';
  const issued = $('issued').value || null;
  const due = $('due').value || null;
  const paid = $('paid').checked;
  const notes = $('notes').value || '';
  if(!client || isNaN(amount) || !due){ alert('Client, amount and due date are required'); return }
  const invoices = loadInvoices();
  invoices.push({id: Date.now(), client, amount, currency, issued, due, paid, notes});
  saveInvoices(invoices);
  clearForm(); renderInvoices(); renderForecast();
}

function clearForm(){ $('client').value=''; $('amount').value=''; $('currency').value='USD'; $('issued').value=''; $('due').value=''; $('paid').checked=false; $('notes').value=''; }

function renderInvoices(){
  const invoices = loadInvoices();
  const container = $('invoices-container');
  if(invoices.length===0){ container.innerHTML = '<em>No invoices yet.</em>'; return }
  let html = '<table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Client</th><th>Amount</th><th>Currency</th><th>Due</th><th>Paid</th><th>Notes</th><th>Actions</th></tr>';
  invoices.sort((a,b)=> new Date(a.due) - new Date(b.due));
  for(const inv of invoices){
    html += `<tr><td>${escapeHtml(inv.client)}</td><td style="text-align:right">${inv.amount.toFixed(2)}</td><td>${escapeHtml(inv.currency)}</td><td>${inv.due||''}</td><td>${inv.paid? 'Yes':'No'}</td><td>${escapeHtml(inv.notes)}</td><td><button data-id="${inv.id}" class="mark-paid">Toggle Paid</button> <button data-id="${inv.id}" class="del">Delete</button></td></tr>`;
  }
  html += '</table>';
  container.innerHTML = html;
  // attach handlers
  container.querySelectorAll('.mark-paid').forEach(b=> b.addEventListener('click', e=> togglePaid(e.target.dataset.id)));
  container.querySelectorAll('.del').forEach(b=> b.addEventListener('click', e=> deleteInvoice(e.target.dataset.id)));
}

function togglePaid(id){ const invoices = loadInvoices(); const idx = invoices.findIndex(i=> i.id==id); if(idx>=0){ invoices[idx].paid = !invoices[idx].paid; saveInvoices(invoices); renderInvoices(); renderForecast(); } }
function deleteInvoice(id){ if(!confirm('Delete invoice?')) return; const invoices = loadInvoices().filter(i=> i.id!=id); saveInvoices(invoices); renderInvoices(); renderForecast(); }

function escapeHtml(s){ return (s||'').replace(/[&<>\"]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function exportCSV(){ const invoices = loadInvoices(); if(invoices.length===0){ alert('No data to export'); return };
  const hdr = ['client','amount','currency','issued','due','paid','notes'];
  const rows = invoices.map(i=> hdr.map(h=> JSON.stringify(i[h]===undefined?'': (i[h]===null?'':i[h])) ).join(','));
  const csv = hdr.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function handleCSVFile(e){ const f = e.target.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = ()=> { parseCSV(reader.result); e.target.value=''; }; reader.readAsText(f); }

function parseCSV(text){ // naive CSV parse assuming simple rows
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(lines.length<1) return alert('Empty CSV');
  const hdr = lines[0].split(',').map(h=> h.trim().replace(/^"|"$/g,''));
  const required = ['client','amount','due'];
  const hasRequired = required.every(r=> hdr.includes(r));
  if(!hasRequired) return alert('CSV must include headers: client,amount,due');
  const invoices = loadInvoices();
  for(let i=1;i<lines.length;i++){
    const cols = splitCSVLine(lines[i]); if(cols.length===0) continue;
    const obj = {};
    for(let j=0;j<hdr.length;j++){ obj[hdr[j]] = cols[j] ? cols[j].replace(/^"|"$/g,'') : '' }
    obj.id = Date.now() + i;
    obj.amount = parseFloat((obj.amount||'').replace(/[^0-9\.\-]/g,'')) || 0;
    obj.currency = obj.currency || 'USD';
    obj.paid = (obj.paid||'').toLowerCase() === 'true' || false;
    invoices.push(obj);
  }
  saveInvoices(invoices); renderInvoices(); renderForecast(); alert('Imported ' + (lines.length-1) + ' rows');
}

function splitCSVLine(line){ const parts=[]; let cur=''; let inQ=false; for(let ch of line){ if(ch==='"'){ inQ=!inQ; cur+=ch; } else if(ch===',' && !inQ){ parts.push(cur); cur=''; } else cur+=ch } if(cur!=='') parts.push(cur); return parts; }

function clearData(){ if(!confirm('Clear all saved invoices?')) return; localStorage.removeItem(STORAGE_KEY); renderInvoices(); renderForecast(); }

function renderForecast(){
  const invoices = loadInvoices().filter(i=> !i.paid && i.due);
  const container = $('forecast-container');
  if(invoices.length===0){ container.innerHTML = '<em>No outstanding invoices to forecast.</em>'; return }
  const months = buildMonths(6);
  const rows = months.map(m=> ({monthLabel: m.label, start: m.start, end: m.end, total: 0}));
  for(const inv of invoices){
    const due = new Date(inv.due);
    for(const r of rows){ if(due >= r.start && due <= r.end){ r.total += (inv.amount||0); break } }
  }
  // HTML table
  let html = '<table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Month</th><th>Projected Inflow (outstanding)</th></tr>';
  let cumulative = 0;
  for(const r of rows){ cumulative += r.total; html += `<tr><td>${r.monthLabel}</td><td style="text-align:right">${r.total.toFixed(2)}</td></tr>` }
  html += `<tr><th>Total (next ${rows.length} months)</th><th style="text-align:right">${rows.reduce((s,v)=> s+v.total,0).toFixed(2)}</th></tr>`;
  html += '</table>';
  container.innerHTML = html;
}

function buildMonths(n){ const out=[]; const now = new Date(); for(let i=0;i<n;i++){ const d = new Date(now.getFullYear(), now.getMonth()+i, 1); const start = new Date(d.getFullYear(), d.getMonth(), 1); const end = new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999); out.push({label: d.toLocaleString(undefined, {month:'short', year:'numeric'}), start, end}); } return out }

