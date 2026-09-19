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
  server.js            — Express app: Messenger webhook, Send API, report generation
  storage.js           — uploads generated reports to Firebase Storage, returns a URL
  package.json
  .env.example         — copy to .env and fill in your Meta + Firebase credentials
```

## Setup

**Backend**
```bash
cd backend
cp .env.example .env   # fill in PAGE_ACCESS_TOKEN, VERIFY_TOKEN, APP_SECRET
npm install
npm run dev
```

You'll need to:
1. Create a Meta Developer App + connect a Facebook Page.
2. Generate a Page Access Token (Meta for Developers → Messenger → Settings).
3. Set your webhook URL (e.g. via ngrok in dev) and VERIFY_TOKEN to match `.env`.
4. Subscribe your Page to `messages` and `messaging_postbacks` webhook fields.
5. Create a Firebase project, enable Storage, generate a service account key
   (Project Settings → Service Accounts → Generate new private key), and point
   `FIREBASE_SERVICE_ACCOUNT_PATH` (or `_JSON`) and `FIREBASE_STORAGE_BUCKET` at it.

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
- Auth (Firebase Auth or custom JWT)
- Database models (see the data model discussed earlier: users, items,
  stock_check_requests, stock_checks, reports, discrepancies)
- Offline queue with IndexedDB (Dexie.js) tied to the service worker's sync event
- Linking a user account to their Messenger PSID (captured in the webhook handler)
- Wiring `OcrScanner`/`BarcodeScanner` output into the stock check form and
  matching scanned SKUs against the `items` table
