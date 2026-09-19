# Stock Check PWA — Scaffold

## Structure

```
frontend/
  manifest.json           — PWA manifest (icons, theme, shortcuts)
  service-worker.js       — offline caching, background sync, push notifications
  register-sw.js          — registers the SW + handles install prompt
  package.json            — frontend dependencies
  components/
    OcrScanner.jsx        — camera capture + Tesseract.js text recognition
    BarcodeScanner.jsx    — live barcode/QR scanning via html5-qrcode

backend/
  server.js            — Express app: report generation (POST /api/reports returns an .xlsx)
  package.json
  .env.example         — copy to .env
```

## Setup

**Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Test it: `curl http://localhost:4000/health`

**Frontend**
Drop the `frontend/` contents into your React/Vue project:
```bash
cd frontend
npm install
```
Link the manifest in `index.html`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0f172a" />
```
Call `registerServiceWorker()` from your app's entry file, and import
`OcrScanner` / `BarcodeScanner` from `components/` into your Stock Check screen.

## Not yet implemented (next steps)
- Auth (Supabase Auth or custom JWT)
- Database models (see the data model discussed earlier: users, items,
  stock_check_requests, stock_checks, reports, discrepancies)
- Offline queue with IndexedDB (Dexie.js) tied to the service worker's sync event
- Wiring `OcrScanner`/`BarcodeScanner` output into the stock check form and
  matching scanned SKUs against the `items` table
