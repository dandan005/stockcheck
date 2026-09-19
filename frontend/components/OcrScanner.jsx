// OcrScanner.jsx
// Captures a photo (camera input) and runs OCR client-side with Tesseract.js.
// Good for reading labels, printed SKUs, or handwritten counts on paper sheets.
// For anything with a printed barcode, prefer BarcodeScanner.jsx — it's far
// more reliable and faster than OCR for that case.

import { useState, useRef } from "react";
import { createWorker } from "tesseract.js";

export default function OcrScanner({ onResult }) {
  const [status, setStatus] = useState("idle"); // idle | scanning | done | error
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("scanning");
    setText("");

    try {
      const worker = await createWorker("eng"); // loads the English model
      const {
        data: { text: recognizedText },
      } = await worker.recognize(file);
      await worker.terminate();

      setText(recognizedText.trim());
      setStatus("done");
      onResult?.(recognizedText.trim());
    } catch (err) {
      console.error("OCR failed:", err);
      setStatus("error");
    }
  }

  return (
    <div className="ocr-scanner">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment" // opens rear camera on mobile
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button onClick={() => fileInputRef.current?.click()}>
        {status === "scanning" ? "Scanning..." : "Scan with Camera"}
      </button>

      {status === "done" && (
        <div className="ocr-result">
          <p>Recognized text:</p>
          <pre>{text || "(nothing detected)"}</pre>
        </div>
      )}

      {status === "error" && (
        <p className="ocr-error">Couldn't read that image — try again with better lighting.</p>
      )}
    </div>
  );
}

/*
Setup:
  npm install tesseract.js

Notes:
- Runs entirely client-side (works offline once the language model is cached).
- First scan downloads the language model (~2-4MB for English) — consider
  pre-caching it in your service worker's APP_SHELL list for true offline use.
- For structured data (e.g. "SKU: 12345, QTY: 20"), parse `text` with a regex
  or hand it to your backend for cleanup rather than trusting raw OCR output.
*/
