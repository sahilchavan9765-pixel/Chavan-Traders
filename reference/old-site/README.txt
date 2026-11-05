# Chavan Traders Business Management Website

## Run
Open `index.html` in a modern browser (Chrome, Edge, Firefox).

## Demo login
- Username: `admin`
- Password: `admin123`

## Included
- Dashboard summary
- Product purchase and sales entries
- Stock calculation (purchases minus sales)
- Paid / unpaid / partial payment tracking
- Customer and supplier contact register
- Expense register
- CSV exports for Excel
- Responsive layout

## Important prototype limitations
This is a browser-only prototype. Records are stored in the browser's local storage on this device. They are not securely protected, not shared across devices, and can be lost if browser data is cleared. The demo login is not production security. Do not enter sensitive or confidential customer/financial information.

For real business use, deploy a backend (e.g. Flask), a secured MySQL database, server-side authentication, role permissions, HTTPS, automated backups, and audit logs. Also have the stock unit and billing/tax rules reviewed before relying on calculations.
