import Dexie from "dexie";

const db = new Dexie("stockcheck-cache");
db.version(1).stores({ items: "id", checks: "requestId" });
db.version(2).stores({ items: "id", checks: "requestId", kv: "key" });

export async function saveItems(items) {
  await db.transaction("rw", db.items, async () => {
    await db.items.clear();
    await db.items.bulkPut(items);
  });
}

export function loadCachedItems() {
  return db.items.toArray();
}

export async function saveChecks(requestId, rows) {
  await db.checks.put({ requestId, rows });
}

export async function loadCachedChecks(requestId) {
  const rec = await db.checks.get(requestId);
  return rec ? rec.rows : null;
}
export async function saveKV(key, value) {
  await db.kv.put({ key, value });
}

export async function loadKV(key) {
  const rec = await db.kv.get(key);
  return rec ? rec.value : null;
}

export async function clearCaches() {
  await db.transaction("rw", db.items, db.checks, db.kv, async () => {
    await db.items.clear();
    await db.checks.clear();
    await db.kv.clear();
  });
}
