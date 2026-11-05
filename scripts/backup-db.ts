/**
 * backup-db.ts — Exports ALL tables to a JSON file in /backups/
 * Run: npx ts-node --esm scripts/backup-db.ts
 * Or triggered automatically by the app on startup
 */
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function backupAll() {
  const dataDir = path.join(root, ".pgdata");
  if (!fs.existsSync(dataDir)) {
    console.log("[backup] No .pgdata directory found — skipping PGlite backup.");
    return;
  }

  const pid = path.join(dataDir, "postmaster.pid");
  if (fs.existsSync(pid)) { try { fs.unlinkSync(pid); } catch {} }

  const pg = new PGlite(dataDir);

  const tables = [
    "users", "parties", "products", "bills", "bill_items",
    "payments", "payment_allocations", "bill_shares",
    "stock_adjustments", "calls", "enquiries", "settings",
    "audit_logs", "counters",
  ];

  const backup: Record<string, any[]> = {};
  for (const t of tables) {
    try {
      const r = await pg.query(`SELECT * FROM ${t}`);
      backup[t] = r.rows;
    } catch (e: any) {
      backup[t] = [];
      console.warn(`[backup] Table ${t} skipped: ${e?.message?.slice(0, 60)}`);
    }
  }

  await pg.close();

  const backupDir = path.join(root, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const fname = `backup-${new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "Z")}.json`;
  const fpath = path.join(backupDir, fname);
  fs.writeFileSync(fpath, JSON.stringify(backup, null, 2));
  console.log(`[backup] ✅ Saved to ${fname}`);
  
  // Print row counts
  for (const [t, rows] of Object.entries(backup)) {
    if (rows.length > 0) console.log(`  ${t}: ${rows.length} rows`);
  }
  
  return fname;
}

backupAll().catch(e => { console.error("[backup] Fatal:", e?.message); process.exit(1); });
