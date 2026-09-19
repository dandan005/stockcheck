import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ELEMENT_ID = "barcode-scanner-viewport";

export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let scanner = null;
    let started = null;
    let handled = false;

    // Deferred start: in dev, the instant mount/unmount/mount cycle
    // clears this timer before the first camera start ever runs.
    const timer = setTimeout(() => {
      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      started = scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (handled) return;
            handled = true;
            navigator.vibrate?.(100);
            onScanRef.current?.(decodedText);
          },
          () => {}
        )
        .catch((err) => {
          console.error("Camera start failed:", err);
          setError("Couldn't access the camera. Check permissions.");
        });
    }, 0);

    return () => {
      clearTimeout(timer);
      if (!scanner) return;
      const s = scanner;
      started.then(() => {
        try {
          s.stop().then(() => s.clear()).catch(() => {});
        } catch {
          /* scanner wasn't running */
        }
      });
    };
  }, []);

  return (
    <div className="barcode-scanner">
      <div id={SCANNER_ELEMENT_ID} style={{ width: "100%" }} />
      {error && <p className="scanner-error" style={{ color: "#f87171" }}>{error}</p>}
      <button onClick={onClose}>Close Scanner</button>
    </div>
  );
}
