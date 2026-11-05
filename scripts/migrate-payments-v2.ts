/**
 * Migration: Add new payment fields - PGlite compatible version.
 * Checks if column exists before adding.
 * Run with: npx tsx scripts/migrate-payments-v2.ts
 */
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const connUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

async function run() {
  console.log("🔄 Running payments v2 migration (PGlite-compatible)...");

  const { PGlite } = require("@electric-sql/pglite");
  const dataDir = path.join(process.cwd(), ".pgdata");
  const pidFile = path.join(dataDir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch {}
  }
  const pg = new PGlite(dataDir);

  // Check which columns already exist
  const colRes = await pg.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'payments'"
  );
  const existingCols = new Set((colRes.rows as any[]).map((r: any) => r.column_name));
  console.log("Existing columns:", [...existingCols].join(", "));

  const addColIfMissing = async (colDef: string, colName: string) => {
    if (existingCols.has(colName)) {
      console.log(`  ⏭ ${colName} already exists`);
    } else {
      console.log(`  ➕ Adding ${colName}`);
      await pg.exec(`ALTER TABLE payments ADD COLUMN ${colDef}`);
      existingCols.add(colName);
    }
  };

  // Add new columns
  await addColIfMissing(`direction TEXT NOT NULL DEFAULT 'OUT'`, "direction");
  await addColIfMissing(`reference_no TEXT NOT NULL DEFAULT ''`, "reference_no");
  await addColIfMissing(`voucher_no TEXT NOT NULL DEFAULT ''`, "voucher_no");
  await addColIfMissing(`handled_by TEXT NOT NULL DEFAULT ''`, "handled_by");
  await addColIfMissing(`paid_by_name TEXT NOT NULL DEFAULT ''`, "paid_by_name");
  await addColIfMissing(`timing_tag TEXT NOT NULL DEFAULT 'with_bill'`, "timing_tag");
  await addColIfMissing(`recorded_by UUID REFERENCES users(id)`, "recorded_by");

  // Extend mode: PGlite doesn't easily support ALTER CONSTRAINT, so we skip it for now
  // The schema uses an enum type at the application layer

  // Backfill direction from party_type
  console.log("  Backfilling direction...");
  await pg.exec(`UPDATE payments SET direction = CASE WHEN party_type = 'farmer' THEN 'OUT' ELSE 'IN' END`);

  // Backfill timing_tag
  console.log("  Backfilling timing_tag...");
  await pg.exec(`UPDATE payments SET timing_tag = CASE WHEN bill_id IS NOT NULL THEN 'with_bill' ELSE 'advance' END`);

  // Backfill recorded_by = created_by
  console.log("  Backfilling recorded_by...");
  await pg.exec(`UPDATE payments SET recorded_by = created_by WHERE recorded_by IS NULL AND created_by IS NOT NULL`);

  // Generate voucher numbers in date order
  console.log("  Generating voucher numbers...");
  const paymentsRes = await pg.query(
    `SELECT id, direction, payment_date, created_at FROM payments WHERE voucher_no = '' OR voucher_no IS NULL ORDER BY direction, payment_date, created_at`
  );
  const rows: any[] = paymentsRes.rows;
  const pvRows = rows.filter((r: any) => r.direction === "OUT");
  const rcRows = rows.filter((r: any) => r.direction === "IN");

  for (let i = 0; i < pvRows.length; i++) {
    const vno = `PV-${String(i + 1).padStart(4, "0")}`;
    await pg.exec(`UPDATE payments SET voucher_no = '${vno}' WHERE id = '${pvRows[i].id}'`);
  }
  for (let i = 0; i < rcRows.length; i++) {
    const vno = `RC-${String(i + 1).padStart(4, "0")}`;
    await pg.exec(`UPDATE payments SET voucher_no = '${vno}' WHERE id = '${rcRows[i].id}'`);
  }
  console.log(`  ✅ Assigned ${pvRows.length} PV vouchers, ${rcRows.length} RC vouchers`);

  // Print before/after summary
  const countRes = await pg.query(
    `SELECT direction, COUNT(*) as cnt, COALESCE(SUM(amount::numeric),0) as total FROM payments WHERE deleted_at IS NULL GROUP BY direction`
  );
  console.log("\n📊 Payment summary after migration:");
  for (const r of countRes.rows as any[]) {
    const lbl = r.direction === "OUT" ? "OUT (paid to farmers)  " : "IN  (received from clients)";
    console.log(`  ${lbl}: ${r.cnt} records, ₹${Number(r.total).toLocaleString("en-IN")}`);
  }

  await pg.close();
  console.log("\n✅ Migration complete!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
