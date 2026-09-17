---
layout: default
title: Freelancer Cashflow Forecast
---

<section>
  <p>A lightweight client-side cashflow tool for freelancers. Add invoices manually or import a CSV, then preview a 6-month forecast and export data.</p>

  <h3>Add invoice</h3>
  <div>
    <input id="client" placeholder="Client name" style="width:260px">
    <input id="amount" placeholder="Amount" style="width:120px">
    <input id="currency" placeholder="Currency (USD)" style="width:80px" value="USD">
  </div>
  <div style="margin-top:6px">
    <label>Issued: <input id="issued" type="date"></label>
    <label style="margin-left:8px">Due: <input id="due" type="date"></label>
    <label style="margin-left:8px"><input id="paid" type="checkbox"> Paid</label>
  </div>
  <div style="margin-top:6px">
    <input id="notes" placeholder="Notes" style="width:460px">
  </div>
  <div style="margin-top:8px">
    <button id="add-invoice">Add Invoice</button>
    <button id="export-csv">Export CSV</button>
    <button id="import-csv">Import CSV</button>
    <input id="csv-file" type="file" accept="text/csv" style="display:none">
    <button id="clear-data">Clear All Data</button>
  </div>

  <h3 style="margin-top:16px">Invoices</h3>
  <div id="invoices-container"></div>

  <h3 style="margin-top:16px">6‑Month Cashflow Forecast</h3>
  <div id="forecast-container"></div>
</section>
