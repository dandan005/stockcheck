// One-time import of items from an .xlsx sheet:
//   prod_no -> sku, prodname -> name, um -> unit
// Dry run by default. Add --go to actually insert. Existing SKUs are left untouched.
import fs from "node:fs";
import ExcelJS from "exceljs";

const file = process.argv[2];
const go = process.argv.includes("--go");
if (!file) {
  console.log("Usage: node import-items.mjs <file.xlsx> [--go]");
  process.exit(1);
}

// Load .env from the current folder (values are never printed).
try {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
function text(v) {
  if (v == null) return "";
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((t) => t.text).join("").trim();
    if (v.result != null) return String(v.result).trim();
    if (v.text != null) return String(v.text).trim();
    return "";
  }
  return String(v).trim();
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

// Find the sheet and header row that contain prod_no and prodname.
let found = null;
for (const ws of wb.worksheets) {
  for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
    const cols = {};
    ws.getRow(r).eachCell((cell, c) => {
      const k = norm(text(cell.value));
      if (k === "prodno") cols.sku = c;
      if (k === "prodname") cols.name = c;
      if (k === "um" || k === "uom") cols.unit = c;
    });
    if (cols.sku && cols.name) {
      found = { ws, headerRow: r, cols };
      break;
    }
  }
  if (found) break;
}
if (!found) {
  console.log('Could not find "prod_no" and "prodname" headers in the first 15 rows of any sheet.');
  process.exit(1);
}

const { ws, headerRow, cols } = found;
const rows = [];
const seen = new Set();
let skipped = 0;
let repeated = 0;
for (let r = headerRow + 1; r <= ws.rowCount; r++) {
  const row = ws.getRow(r);
  const sku = text(row.getCell(cols.sku).value);
  const name = text(row.getCell(cols.name).value);
  const unit = cols.unit ? text(row.getCell(cols.unit).value) : "";
  if (!sku || !name) {
    skipped++;
    continue;
  }
  if (seen.has(sku)) {
    repeated++;
    continue;
  }
  seen.add(sku);
  rows.push({ sku, name, unit: unit || null, expected_qty: 0 });
}

console.log(`Sheet "${ws.name}", headers on row ${headerRow}`);
console.log(`${rows.length} items ready, ${skipped} rows skipped (missing code or name), ${repeated} repeated codes skipped`);
console.log("Units found:", [...new Set(rows.map((r) => r.unit))].join(", "));
console.log("First items:");
rows.slice(0, 5).forEach((r) => console.log(" ", JSON.stringify(r)));

if (!go) {
  console.log("\nDry run only, nothing was changed. Add --go to insert.");
  process.exit(0);
}

const { createClient } = await import("@supabase/supabase-js");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.log(
    "Couldn't find the Supabase URL and service key in .env. Variable names starting with SUPABASE:",
    Object.keys(process.env).filter((k) => k.startsWith("SUPABASE")).join(", ") || "(none)"
  );
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const existing = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("items").select("sku").range(from, from + 999);
  if (error) {
    console.log("Read failed:", error.message);
    process.exit(1);
  }
  data.forEach((d) => existing.add(d.sku));
  if (data.length < 1000) break;
}
const fresh = rows.filter((r) => !existing.has(r.sku));
console.log(
  `${existing.size} items already in the app; ${rows.length - fresh.length} of yours already exist and are left untouched; inserting ${fresh.length} new`
);
for (let i = 0; i < fresh.length; i += 500) {
  const { error } = await supabase.from("items").insert(fresh.slice(i, i + 500));
  if (error) {
    console.log("Insert failed at batch", i / 500 + 1, ":", error.message);
    process.exit(1);
  }
  console.log("Inserted", Math.min(i + 500, fresh.length), "of", fresh.length);
}
console.log("Done.");
