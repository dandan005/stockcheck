// BarcodeScanner.jsx
// Live camera barcode/QR scanning using html5-qrcode. This is the primary
// path for SKU entry — faster and far more reliable than OCR.

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ELEMENT_ID = "barcode-scanner-viewport";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" }, // rear camera
        {
          fps: 10,
          qrbox: { width: 250, height: 150 }, // wider box suits 1D barcodes
        },
        (decodedText) => {
          onScan?.(decodedText);
          // Optionally stop after first successful scan:
          // scanner.stop();
        },
        () => {
          // fires continuously while no code is found — safe to ignore
        }
      )
      .catch((err) => {
        console.error("Camera start failed:", err);
        setError("Couldn't access the camera. Check permissions.");
      });

    return () => {
      scannerRef.current
        ?.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="barcode-scanner">
      <div id={SCANNER_ELEMENT_ID} style={{ width: "100%" }} />
      {error && <p className="scanner-error">{error}</p>}
      <button onClick={onClose}>Close Scanner</button>
    </div>
  );
}

/*
Setup:
  npm install html5-qrcode

Usage:
  <BarcodeScanner
    onScan={(code) => {
      // look up item by SKU/barcode, prefill the count form
    }}
    onClose={() => setScannerOpen(false)}
  />

Notes:
- Supports most 1D (UPC/EAN/Code128) and QR formats out of the box.
- Requires HTTPS (or localhost) for camera access — same constraint as the
  service worker.
- Consider a short vibration/beep on successful scan for UX feedback
  (navigator.vibrate(100) works on most Android browsers).
*/
