Freelancer Cashflow Forecast
=============================

Overview
--------
A client-side Jekyll app for freelancers to manage invoices and forecast cashflow. Add invoices manually or import a CSV, then preview a 6-month projected inflow based on invoice due dates.

Features
--------
- Manual invoice entry (client, amount, issued/due dates, paid flag, notes)
- CSV import/export (headers: client,amount,currency,issued,due,paid,notes)
- Data stored locally in browser localStorage (no server)
- 6-month forecast table of projected inflows from outstanding invoices

Run locally
-----------
1. cd jekyll-gmail-budget
2. bundle install
3. bundle exec jekyll serve
4. Open http://localhost:4000

Security & privacy
------------------
All data stays in the browser localStorage. Do not commit sensitive data to the repository.

Next improvements
-----------------
- Add charts (Chart.js), IndexedDB for larger datasets, CSV parsing library for edge cases, and PDF/receipt import.
