# Mileage Tracker

GPS-based mileage tracker and tax deduction calculator for rideshare drivers (Uber, Lyft, etc).

## Features

- **GPS Trip Tracking** — Manual start/stop with real-time mile counting
- **Tax Deductions** — Automatic IRS standard mileage deduction calculation ($0.70/mi for 2025)
- **Tax Estimates** — Self-employment tax, income tax, and take-home pay estimates
- **CSV Import** — Import trip history from Uber/Lyft driver dashboard exports
- **CSV Export** — Download your trip log for tax filing
- **PWA** — Install to your phone's home screen for app-like experience
- **Offline Support** — Works without internet after first load
- **Local Storage** — All data stays on your device

## Setup (GitHub Pages)

1. Create a repository named `<your-username>.github.io` (or any repo with Pages enabled)
2. Copy all files into the repo root:
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - `icon-192.png`
   - `icon-512.png`
3. Push to GitHub
4. Go to Settings → Pages → set source to main branch
5. Visit `https://<your-username>.github.io`

## Usage

1. Open the site on your phone
2. **Install as app**: Tap browser menu → "Add to Home Screen"
3. **Track miles**: Tap START when you go online in Uber, STOP when done
4. **Tag trips**: Mark as Business or Personal
5. **Enter earnings**: Add what Uber paid for each session
6. **View taxes**: Check the Taxes tab for deduction and tax estimates
7. **Export**: Download CSV anytime from Settings

## Important Notes

- Grant **precise location** permission for accurate tracking
- Keep the browser tab/app open while driving
- Track ALL driving while on-duty (including deadhead miles between trips) — these are fully deductible
- Tax estimates are rough — consult a tax professional for actual filing
- All data is stored locally in your browser's localStorage
