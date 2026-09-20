import Dexie from "dexie";

const db = new Dexie("stockcheck-cache");
db.version(1).stores({ items: "id", checks: "requestId" });

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
