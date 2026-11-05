import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

async function audit() {
  const b1Path = path.join(process.cwd(), "backups", "backup-2026-11-03T13-04-06-565Z.json");
  const b2Path = path.join(process.cwd(), "backups", "backup-2026-11-04T05-48-19-216Z.json");

  const b1 = fs.existsSync(b1Path) ? JSON.parse(fs.readFileSync(b1Path, "utf-8")) : null;
  const b2 = fs.existsSync(b2Path) ? JSON.parse(fs.readFileSync(b2Path, "utf-8")) : null;

  const dataDir = path.join(process.cwd(), ".pgdata");
  const pidFile = path.join(dataDir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch {}
  }
  const pg = new PGlite(dataDir);

  const curBillsRes = await pg.query("SELECT * FROM bills ORDER BY bill_no;");
  const curPaymentsRes = await pg.query("SELECT * FROM payments ORDER BY payment_date;");
  const curCallsRes = await pg.query("SELECT * FROM calls;");
  const curAllocsRes = await pg.query("SELECT * FROM payment_allocations;");

  console.log("=== CURRENT DATABASE STATE ===");
  console.log(`Current Bills (${curBillsRes.rows.length}):`, curBillsRes.rows.map((r: any) => `${r.bill_no} (${r.party_name}, ${r.deleted_at ? 'DELETED' : 'ACTIVE'})`));
  console.log(`Current Payments (${curPaymentsRes.rows.length}):`, curPaymentsRes.rows.map((r: any) => `${r.party_name} - ₹${r.amount}`));
  console.log(`Current Calls (${curCallsRes.rows.length}):`, curCallsRes.rows.map((r: any) => `${r.caller_name} - ${r.product}`));
  console.log(`Current Payment Allocations count:`, curAllocsRes.rows.length);

  console.log("\n=== BACKUP 1 (2026-11-03) ===");
  if (b1) {
    console.log(`Bills (${b1.bills?.length || 0}):`, (b1.bills || []).map((r: any) => `${r.billNo || r.bill_no} (${r.partyName || r.party_name})`));
  }

  console.log("\n=== BACKUP 2 (2026-11-04) ===");
  if (b2) {
    console.log(`Bills (${b2.bills?.length || 0}):`, (b2.bills || []).map((r: any) => `${r.billNo || r.bill_no} (${r.partyName || r.party_name})`));
  }

  await pg.close();
}

audit()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

