---
layout: default
title: Gmail → Budget
---

<div>
  <label>Google OAuth Client ID: <input id="client-id" placeholder="Enter OAuth Client ID (Web)" style="width:420px"></label>
</div>
<div>
  <label>Spreadsheet ID: <input id="spreadsheet-id" placeholder="Enter Google Spreadsheet ID" style="width:420px"></label>
</div>
<div style="margin-top:8px">
  <button id="authorize-btn">Authorize & Fetch Emails</button>
  <button id="signout-btn" style="display:none">Sign out</button>
</div>

<pre id="output" style="white-space:pre-wrap; background:#f7f7f7; padding:8px; margin-top:12px; height:300px; overflow:auto"></pre>

<button id="append-sheet" style="margin-top:8px; display:none">Append Budget to Sheet</button>
