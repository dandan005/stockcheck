import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ELEMENT_ID = "barcode-scanner-viewport";

const corner = {
  position: "absolute",
  width: 22,
  height: 22,
  border: "3px solid #3b5bdb",
  pointerEvents: "none",
};

export default function BarcodeScanner({ onScan, onClose, label }) {
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#111827",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 20,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          &#10005;
        </button>

        {label && (
          <div
            style={{
              fontSize: 11,
              letterSpacing: 3,
              color: "#8a94a6",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {label}
          </div>
        )}
        <h1
          style={{
            fontSize: 19,
            fontWeight: 700,
            color: "#fde9b8",
            margin: "0 0 18px 0",
            letterSpacing: 0.5,
          }}
        >
          Scan Barcode
        </h1>

        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 3",
            background: "#05080f",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div id={SCANNER_ELEMENT_ID} style={{ width: "100%", height: "100%" }} />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "72%",
              height: "46%",
              pointerEvents: "none",
            }}
          >
            <div style={{ ...corner, top: 0, left: 0, borderRight: "none", borderBottom: "none", borderRadius: "6px 0 0 0" }} />
            <div style={{ ...corner, top: 0, right: 0, borderLeft: "none", borderBottom: "none", borderRadius: "0 6px 0 0" }} />
            <div style={{ ...corner, bottom: 0, left: 0, borderRight: "none", borderTop: "none", borderRadius: "0 0 0 6px" }} />
            <div style={{ ...corner, bottom: 0, right: 0, borderLeft: "none", borderTop: "none", borderRadius: "0 0 6px 0" }} />
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", marginTop: 16 }}>
          Position the barcode within the frame
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", marginTop: 12 }}>{error}</p>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#e8ecf2",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
