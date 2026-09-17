Jekyll Gmail → Budget
=====================

Overview
--------
A minimal Jekyll static site that authenticates users with Google (OAuth) from the browser, reads recent transactional emails using the Gmail API, parses amounts, generates a simple budget summary, and can append the summary to a Google Sheet.

Setup
-----
1. Create a Google Cloud Project and enable the Gmail API and Google Sheets API.
2. Create OAuth 2.0 Client ID (type: Web application). Add origin: http://localhost:4000 and redirect URI if needed.
3. Run locally: cd jekyll-gmail-budget && bundle install && bundle exec jekyll serve
4. Open http://localhost:4000, paste your OAuth Client ID and target Spreadsheet ID, then click "Authorize & Fetch Emails".

Security
--------
- Do NOT commit secrets. The app requests OAuth tokens in-browser. Keep spreadsheet IDs and client IDs private if you wish.

Notes & limitations
-------------------
- This is a client-side implementation; sensitive data is handled by the user's browser only.
- Parsing is heuristic-based; refine regexes and category mapping for production use.

