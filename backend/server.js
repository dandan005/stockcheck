import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import ExcelJS from "exceljs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const { PORT = 4000 } = process.env;

/* ------------------------------------------------------------------ */
/* Report generation (xlsx) — built in memory, no temp files          */
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

  return workbook.xlsx.writeBuffer();
}

/* ------------------------------------------------------------------ */
/* API                                                                */
/* ------------------------------------------------------------------ */

app.get("/health", (req, res) => res.json({ ok: true }));

// POST { checkData: [...] } -> returns the .xlsx file as a download
app.post("/api/reports", async (req, res) => {
  try {
    const { checkData } = req.body;
    if (!Array.isArray(checkData) || checkData.length === 0) {
      return res.status(400).json({ success: false, error: "checkData must be a non-empty array" });
    }

    const buffer = await generateStockReport(checkData);
    const filename = `stock-report-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
