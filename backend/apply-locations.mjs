import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envPath = process.env.HOME + "/storage/shared/HTML/stockcheck-scaffold/backend/.env";
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const csvPath = process.argv[2] || (process.env.HOME + "/location-confident.csv");

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const lines = fs.readFileSync(csvPath, "utf8").split("\n").filter(Boolean);
const rows = lines.slice(1);

let ok = 0, failed = 0, skipped = 0;
const errors = [];

for (const line of rows) {
  const [sku, , , proposedFloor] = splitCsvLine(line);
  if (!sku || !proposedFloor) { skipped++; continue; }

  const { error } = await admin.from("items").update({ location: proposedFloor }).eq("sku", sku);
  if (error) {
    failed++;
    errors.push(`${sku}: ${error.message}`);
  } else {
    ok++;
  }
}

console.log(`Updated: ${ok}, Skipped (blank): ${skipped}, Failed: ${failed}`);
if (errors.length) {
  console.log("Errors:");
  for (const e of errors.slice(0, 20)) console.log("  " + e);
  if (errors.length > 20) console.log(`  ...and ${errors.length - 20} more`);
}
