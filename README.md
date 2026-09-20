cat > ~/storage/shared/HTML/stockcheck-scaffold/README.md
# Stock Check

A mobile-first PWA for running stock checks: request a count, assign a checker, count items by hand or barcode scan, and get a variance report as an Excel file.

Built for a real workplace inventory workflow — not a generic template.

## What it does

- **Requesters/admins** create stock check requests and assign a checker.
- **Checkers** start a request, count items (manual quantity entry or barcode scan), and mark it complete once at least one item has been counted.
- **Completed checks** show a variance report (expected vs. counted quantity per item) and can be downloaded as an `.xlsx` file.
- **Admins** manage the item catalog and user accounts.
- Works offline: counts and status changes queue locally and sync once back online.
- Installable as a PWA (Add to Home screen) with a splash screen and a first-run walkthrough per user.

## Roles

- **Admin** — manages items and users, full access to all requests.
- **Requester** — creates and assigns stock check requests.
- **Checker** — counts items on requests assigned to them.

## Tech stack

**Frontend**
- React 18 + Vite
- `vite-plugin-pwa` (offline support, installability)
- Dexie (IndexedDB, offline queue)
- `html5-qrcode` (barcode scanning)

**Backend**
- Node.js + Express (ESM)
- ExcelJS (variance report generation)

**Database & Auth**
- Supabase (Postgres, Row Level Security, Auth)

## Project structure

stockcheck-scaffold/
├── backend/       # Express API server
└── frontend/      # React + Vite PWA
├── components/
├── lib/
├── public/
└── src/        # App.jsx, main.jsx entry points
                ## Running locally

**Backend**

cd backend
node server.js
Runs on port 4000. Restart after any change to `server.js`.

**Frontend**

cd frontend
npm run dev
Runs on port 5173.

To test offline behavior:

npm run build
npx vite preview

Runs the built PWA on port 4173.

Both frontend and backend need their own `.env` (Supabase URL/keys, etc.) — see `.env.example`. Never commit `.env`.

## Status

Actively developed, not yet deployed. Currently used for local testing only.

**Known open items:**
- Expected quantities need to be imported from the company's inventory system (currently all items default to 0, so variance numbers aren't meaningful yet).
- Hosting/deployment is undecided — needs a domain + HTTPS for camera/barcode scanning and installability on other devices.
- A couple of RLS policy changes made directly in the Supabase SQL editor still need to be written down as migration files in this repo.
- Minor data cleanup needed in the item catalog (duplicate codes, inconsistent units).

## Credits

Built solo, with Claude as coding assistant.
