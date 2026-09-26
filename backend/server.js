import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

dotenv.config();

const { PORT = 4000, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY. Put them in backend/.env");
  process.exit(1);
}

// Service-role client: bypasses RLS, used only for admin user management (create/delete auth users).
const adminClient = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

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
    { header: "Location", key: "location", width: 30 },
    { header: "Counted Qty", key: "countedQty", width: 15 },
  ];

  checkData.forEach((row) => sheet.addRow(row));

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
  const pageSize = 1000;
  let allItems = [];
  let from = 0;
  while (true) {
    const { data, error } = await req.supabase
      .from("items")
      .select("*")
      .order("name")
      .range(from, from + pageSize - 1);
    if (error) return res.status(500).json({ error: error.message });
    allItems = allItems.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  res.json(allItems);
});

app.post("/api/items", requireAuth, requireRole("admin"), async (req, res) => {
  const { sku, name, barcode, category, unit, location } = req.body;
  if (!sku || !name) return res.status(400).json({ error: "sku and name are required" });

  const { data, error } = await req.supabase
    .from("items")
    .insert({ sku, name, barcode, category, unit, location })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.put("/api/items/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { sku, name, barcode, category, unit, location } = req.body;
  const { data, error } = await req.supabase
    .from("items")
    .update({ sku, name, barcode, category, unit, location })
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

// Lightweight list of checkers, usable by any signed-in user (requesters need this to assign requests).
app.get("/api/checkers", requireAuth, async (req, res) => {
  if (!adminClient) return res.status(500).json({ error: "Server missing SUPABASE_SERVICE_ROLE_KEY" });
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .eq("role", "checker")
    .order("full_name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  if (!adminClient) return res.status(500).json({ error: "Server missing SUPABASE_SERVICE_ROLE_KEY" });
  const { data: profiles, error: profileErr } = await adminClient
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name");
  if (profileErr) return res.status(500).json({ error: profileErr.message });

  const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers();
  if (authErr) return res.status(500).json({ error: authErr.message });

  const emailById = Object.fromEntries(authData.users.map((u) => [u.id, u.email]));
  const merged = profiles.map((p) => ({ ...p, email: emailById[p.id] || null }));
  res.json(merged);
});

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Admin: user management (create/edit/delete auth accounts)          */
/* ------------------------------------------------------------------ */

app.post("/api/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  if (!adminClient) return res.status(500).json({ error: "Server missing SUPABASE_SERVICE_ROLE_KEY" });
  const { email, password, fullName, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: "email, password and role are required" });
  }
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) return res.status(400).json({ error: createErr.message });

  const { error: profileErr } = await adminClient
    .from("profiles")
    .update({ full_name: fullName || null, role })
    .eq("id", created.user.id);
  if (profileErr) {
    await adminClient.auth.admin.deleteUser(created.user.id).catch(() => {});
    return res.status(400).json({ error: profileErr.message });
  }
  res.status(201).json({ id: created.user.id, email, fullName: fullName || null, role });
});

app.put("/api/admin/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { fullName, role } = req.body;
  const patch = {};
  if (fullName !== undefined) patch.full_name = fullName;
  if (role !== undefined) patch.role = role;
  const { data, error } = await req.supabase
    .from("profiles")
    .update(patch)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete("/api/admin/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  if (!adminClient) return res.status(500).json({ error: "Server missing SUPABASE_SERVICE_ROLE_KEY" });
  if (req.user.id === req.params.id) {
    return res.status(400).json({ error: "You can't delete your own account" });
  }
  const { error } = await adminClient.auth.admin.deleteUser(req.params.id);
  if (error) {
    console.error("deleteUser failed:", JSON.stringify(error, null, 2));
    return res.status(400).json({ error: error.message });
  }
  res.status(204).send();
});

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

app.delete("/api/requests/:id", requireAuth, async (req, res) => {
  const { error } = await req.supabase
    .from("stock_check_requests")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

/* ------------------------------------------------------------------ */
/* Stock checks (the actual item counts against a request)            */
/* ------------------------------------------------------------------ */

app.get("/api/requests/:id/checks", requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from("stock_checks")
    .select("*, items(sku, name, location)")
    .eq("request_id", req.params.id)
    .order("checked_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/checks", requireAuth, async (req, res) => {
  const { requestId, itemId, countedQty, method } = req.body;
  if (!requestId || !itemId || countedQty === undefined) {
    return res.status(400).json({ error: "requestId, itemId and countedQty are required" });
  }

  const { data: item, error: itemErr } = await req.supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .single();
  if (itemErr) return res.status(400).json({ error: "Item not found" });

  const { data, error } = await req.supabase
    .from("stock_checks")
    .upsert(
      {
        request_id: requestId,
        item_id: itemId,
        checked_by: req.user.id,
        expected_qty: 0,
        counted_qty: Number(countedQty),
        method: method || "manual",
      },
      { onConflict: "request_id,item_id" }
    )
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log("Web push configured");
} else {
  console.warn("Web push NOT configured - missing VAPID env vars");
}

app.post("/api/push/subscribe", requireAuth, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription" });
  }
  const { error } = await req.supabase.from("push_subscriptions").upsert(
    { user_id: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: "endpoint" }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

if (adminClient && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  adminClient
    .channel("push-notify")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      async (payload) => {
        const notif = payload.new;
        try {
          const { data: subs } = await adminClient
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", notif.user_id);
          for (const sub of subs || []) {
            const subscription = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            };
            const payloadStr = JSON.stringify({
              title: "Stock Check",
              body: notif.message,
              url: "/",
            });
            webpush.sendNotification(subscription, payloadStr).catch(async (err) => {
              if (err.statusCode === 404 || err.statusCode === 410) {
                await adminClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
              } else {
                console.error("Push send error:", err.message);
              }
            });
          }
        } catch (e) {
          console.error("Push notify handler error:", e.message);
        }
      }
    )
    .subscribe();
  console.log("Listening for new notifications to push");
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

