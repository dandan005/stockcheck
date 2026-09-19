import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";
import ExcelJS from "exceljs";
import { uploadReportFile } from "./storage.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const {
  PORT = 4000,
  PAGE_ACCESS_TOKEN,
  VERIFY_TOKEN,
} = process.env;

/* ------------------------------------------------------------------ */
/* 1. Messenger Webhook — verification (GET) + incoming events (POST) */
/* ------------------------------------------------------------------ */

// Meta calls this once to verify your webhook URL
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Meta calls this whenever a user messages your Page (replies, postbacks, etc.)
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach((entry) => {
      const event = entry.messaging?.[0];
      if (!event) return;

      const senderId = event.sender.id;

      if (event.message) {
        console.log(`Message from ${senderId}:`, event.message.text);
        // TODO: e.g. link this Messenger senderId to a user account
        // so you know who to send reports to later.
      }

      if (event.postback) {
        console.log(`Postback from ${senderId}:`, event.postback.payload);
      }
    });
    return res.status(200).send("EVENT_RECEIVED");
  }

  return res.sendStatus(404);
});

/* ------------------------------------------------------------------ */
/* 2. Send API helper — text + file attachment                       */
/* ------------------------------------------------------------------ */

async function sendMessengerText(recipientId, text) {
  const res = await fetch(
    `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    }
  );
  return res.json();
}

async function sendMessengerFile(recipientId, fileUrl, filename) {
  const res = await fetch(
    `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: "file",
            payload: { url: fileUrl, is_reusable: true },
          },
        },
      }),
    }
  );
  return res.json();
}

/* ------------------------------------------------------------------ */
/* 3. Report generation (xlsx) — stub, swap in real DB data           */
/* ------------------------------------------------------------------ */

async function generateStockReport(checkData) {
  // checkData: [{ sku, name, expectedQty, countedQty, variance, location }]
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Stock Report");

  sheet.columns = [
    { header: "SKU", key: "sku", width: 15 },
    { header: "Name", key: "name", width: 25 },
    { header: "Location", key: "location", width: 15 },
    { header: "Expected Qty", key: "expectedQty", width: 15 },
    { header: "Counted Qty", key: "countedQty", width: 15 },
    { header: "Variance", key: "variance", width: 12 },
  ];

  checkData.forEach((row) => sheet.addRow(row));

  // Highlight rows with a variance
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const variance = row.getCell("variance").value;
    if (variance !== 0) {
      row.getCell("variance").font = { color: { argb: "FFCC0000" }, bold: true };
    }
  });

  const filePath = `/tmp/stock-report-${Date.now()}.xlsx`;
  await workbook.xlsx.writeFile(filePath);
  return filePath;

  // NOTE: In production, upload this file to storage (S3/Firebase Storage/etc.)
  // and return a public URL — Messenger's Send API needs a reachable file URL.
}

/* ------------------------------------------------------------------ */
/* 4. API endpoint: generate + send a report to Messenger             */
/* ------------------------------------------------------------------ */

app.post("/api/reports/send", async (req, res) => {
  try {
    const { recipientId, checkData } = req.body;
    // 1. Generate the report file
    const filePath = await generateStockReport(checkData);

    // 2. Upload to Firebase Storage, get a reachable URL
    const fileUrl = await uploadReportFile(filePath);

    // 3. Notify + send file via Messenger
    await sendMessengerText(recipientId, "Your stock report is ready:");
    const result = await sendMessengerFile(recipientId, fileUrl, "stock-report.xlsx");

    res.json({ success: true, messengerResponse: result, filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
