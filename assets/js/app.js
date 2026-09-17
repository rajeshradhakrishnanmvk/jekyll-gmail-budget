// Simple client-side app using Google Identity Services + gapi
// IMPORTANT: Run on http://localhost:4000 while developing and add that origin to your OAuth client allowed origins.

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/spreadsheets';
let tokenClient;
let gapiInited = false;
let gisInited = false;
let clientId = '';
let apiKey = ''; // optional

function log(msg){const out=document.getElementById('output'); out.textContent += msg + '\n'; out.scrollTop = out.scrollHeight;}

function initButtons(){
  document.getElementById('authorize-btn').addEventListener('click', async ()=>{
    clientId = document.getElementById('client-id').value.trim();
    const spreadsheetId = document.getElementById('spreadsheet-id').value.trim();
    if(!clientId){alert('Provide OAuth Client ID from Google Cloud Console'); return}
    if(!spreadsheetId){alert('Provide Spreadsheet ID to save results'); return}
    if(!gisInited){initGis(clientId)}
    await handleAuth(spreadsheetId);
  });
  document.getElementById('append-sheet').addEventListener('click', ()=>{
    const spreadsheetId = document.getElementById('spreadsheet-id').value.trim();
    if(!spreadsheetId) return alert('Set spreadsheet ID');
    appendBudgetToSheet(spreadsheetId);
  })
}

function initGis(client_id){
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: client_id,
    scope: SCOPES,
    callback: '', // will be set later
  });
  gisInited = true;
  log('GIS initialized');
}

function gapiLoad(){
  gapi.load('client', () => {
    gapiInited = true;
    log('gapi.client loaded');
  });
}
window.onload = ()=>{initButtons(); window.gapiOnLoad = gapiLoad};

async function handleAuth(spreadsheetId){
  return new Promise((resolve,reject)=>{
    tokenClient.callback = async (resp)=>{
      if(resp.error){log('Auth error: '+ JSON.stringify(resp)); return reject(resp)}
      log('Got access token');
      try{
        await gapi.client.init({apiKey: apiKey, discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
          'https://sheets.googleapis.com/$discovery/rest?version=v4'
        ]});
        log('gapi.client initialized');
        // proceed to fetch
        fetchAndBuildBudget().then(()=>{
          document.getElementById('signout-btn').style.display='inline-block';
          document.getElementById('append-sheet').style.display='inline-block';
          resolve();
        }).catch(reject);
      }catch(e){reject(e)}
    };
    // request access token
    tokenClient.requestAccessToken({prompt: 'consent'});
  });
}

async function fetchAndBuildBudget(){
  log('Listing recent messages...');
  // Query heuristics: look for transactional keywords and recent 90 days
  const q = 'newer_than:90d (receipt OR transaction OR paid OR payment OR debited OR charged OR invoice OR "confirmed")';
  const listResp = await gapi.client.gmail.users.messages.list({userId: 'me', q, maxResults: 200});
  if(!listResp.result.messages || listResp.result.messages.length===0){log('No messages found'); return}
  log(`Found ${listResp.result.messages.length} messages`);
  const messages = listResp.result.messages;
  const expenses = [];
  for(const m of messages){
    try{
      const msg = await gapi.client.gmail.users.messages.get({userId:'me', id: m.id, format:'full'});
      const snippet = msg.result.snippet || '';
      const payload = msg.result.payload;
      const body = extractBody(payload) || '';
      const text = (snippet + '\n' + body).replace(/=\r?\n/g,'');
      const found = parseAmounts(text);
      if(found.length){
        found.forEach(f=> expenses.push({source: msg.result.payload.headers, snippet: snippet, amount: f.amount, currency: f.currency, raw: f.raw}));
      }
    }catch(e){ log('msg fetch err: '+e.message) }
  }
  // Aggregate into categories (simple keyword mapping)
  const categorized = categorizeExpenses(expenses);
  const summary = summarize(categorized);
  log('Budget summary:\n' + JSON.stringify(summary, null, 2));
  // store in window for later append
  window._lastBudget = {summary, categorized, expenses};
}

function extractBody(payload){
  if(!payload) return '';
  if(payload.parts){
    for(const p of payload.parts){
      if(p.mimeType === 'text/plain' && p.body && p.body.data) return base64Decode(p.body.data);
      if(p.parts) return extractBody(p);
    }
  }
  if(payload.body && payload.body.data) return base64Decode(payload.body.data);
  return '';
}

function base64Decode(b64){
  // Gmail returns base64url
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  try{ const decoded = atob(b64); return decoded }catch(e){ return '' }
}

function parseAmounts(text){
  // simple regex to find currency amounts like 1,234.56 or 1234 or ₹123
  const re = /([\$₹€£]?\s?)([0-9]+(?:[\,\s][0-9]{3})*(?:\.[0-9]{1,2})?)/g;
  const out = [];
  let m;
  while((m = re.exec(text))!==null){
    const raw = m[0];
    const currency = m[1].trim() || '';
    const num = m[2].replace(/[\,\s]/g,'');
    const amount = parseFloat(num);
    if(!isNaN(amount) && amount>0) out.push({raw, amount, currency});
  }
  return out;
}

function categorizeExpenses(expenses){
  const mapping = [
    {k:['uber','ola','taxi','ride'], cat:'Transport'},
    {k:['amazon','flipkart','shopping','order','purchase'], cat:'Shopping'},
    {k:['grocery','groceries','bigbasket','dmart'], cat:'Groceries'},
    {k:['rent','rent due'], cat:'Rent'},
    {k:['salary','credited'], cat:'Income'}
  ];
  const res = {};
  for(const e of expenses){
    const snippet = (e.snippet||'').toLowerCase();
    let cat = 'Other';
    for(const m of mapping){ if(m.k.some(tok=> snippet.includes(tok))) { cat = m.cat; break }}
    if(!res[cat]) res[cat]=[];
    res[cat].push(e);
  }
  return res;
}

function summarize(categorized){
  const summary = {};
  for(const cat of Object.keys(categorized)){
    summary[cat] = categorized[cat].reduce((s,e)=> s + (e.amount||0), 0);
  }
  return summary;
}

async function appendBudgetToSheet(spreadsheetId){
  if(!window._lastBudget) return alert('No budget built yet');
  const values = [['Category','Amount','Currency','Count']];
  for(const [cat, arr] of Object.entries(window._lastBudget.categorized)){
    const total = arr.reduce((s,a)=> s + (a.amount||0),0);
    const currency = arr.length? arr[0].currency:'',
    values.push([cat, total.toFixed(2), currency, arr.length]);
  }
  const resource = {values};
  try{
    const resp = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      resource
    });
    log('Appended to sheet: ' + JSON.stringify(resp.result, null, 2));
  }catch(e){ log('Sheets append error: '+ e.message) }
}

// Sign out (revoke token) — simple page reload
function signOut(){
  // revoke token by removing from google.accounts
  google.accounts.oauth2.revoke(gapi.client.getToken && gapi.client.getToken().access_token, ()=>{
    log('Signed out');
    window.location.reload();
  });
}

document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'signout-btn') signOut();
});
