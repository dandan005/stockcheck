import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const { PORT = 4000, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY. Put them in backend/.env");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

/* ------------------------------------------------------------------ */
/* Auth: verify the Supabase login token sent by the PWA               */
/* ------------------------------------------------------------------ */

// A Supabase client that acts as the signed-in user, so Row Level Security applies.
function clientForToken(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  const supabase = clientForToken(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired token" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", data.user.id)
    .single();

  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: profile?.role ?? null,
    fullName: profile?.full_name ?? null,
  };
  req.supabase = supabase;
  next();
}

// Usage: app.post("/route", requireAuth, requireRole("admin", "checker"), handler)
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: "Forbidden" });

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

// Who am I? Handy for the PWA to show the user's role.
app.get("/api/me", requireAuth, (req, res) => res.json(req.user));

// POST { checkData: [...] } -> returns the .xlsx file as a download (signed-in users only)
app.post("/api/reports", requireAuth, async (req, res) => {
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

/* ------------------------------------------------------------------ */
/* Items (admin manages the catalog; everyone signed in can read)     */
/* ------------------------------------------------------------------ */

app.get("/api/items", requireAuth, async (req, res) => {
  const { data, error } = await req.supabase.from("items").select("*").order("sku");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/items", requireAuth, requireRole("admin"), async (req, res) => {
  const { sku, name, barcode, category, unit, location, expectedQty } = req.body;
  if (!sku || !name) return res.status(400).json({ error: "sku and name are required" });

  const { data, error } = await req.supabase
    .from("items")
    .insert({ sku, name, barcode, category, unit, location, expected_qty: expectedQty ?? 0 })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.put("/api/items/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { sku, name, barcode, category, unit, location, expectedQty } = req.body;
  const { data, error } = await req.supabase
    .from("items")
    .update({ sku, name, barcode, category, unit, location, expected_qty: expectedQty })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete("/api/items/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { error } = await req.supabase.from("items").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

/* ------------------------------------------------------------------ */
/* Users (admin only — used to assign a checker to a request)         */
/* ------------------------------------------------------------------ */

app.get("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { data, error } = await req.supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ------------------------------------------------------------------ */
/* Stock check requests                                                */
/* ------------------------------------------------------------------ */

// RLS already limits results to: requester, assignee, or admin.
app.get("/api/requests", requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from("stock_check_requests")
    .select("*, items:stock_checks(count)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/requests", requireAuth, requireRole("admin", "requester"), async (req, res) => {
  const { assignedTo, notes, dueDate } = req.body;
  const { data, error } = await req.supabase
    .from("stock_check_requests")
    .insert({
      requested_by: req.user.id,
      assigned_to: assignedTo || null,
      notes: notes || null,
      due_date: dueDate || null,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.put("/api/requests/:id", requireAuth, async (req, res) => {
  const { status, assignedTo, notes } = req.body;
  const patch = {};
  if (status) patch.status = status;
  if (assignedTo !== undefined) patch.assigned_to = assignedTo;
  if (notes !== undefined) patch.notes = notes;
  if (status === "completed") patch.completed_at = new Date().toISOString();

  const { data, error } = await req.supabase
    .from("stock_check_requests")
    .update(patch)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
