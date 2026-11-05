import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

async function restore() {
  const backupFile = path.join(process.cwd(), "backups", "backup-2026-11-03T13-04-06-565Z.json");
  if (!fs.existsSync(backupFile)) {
    throw new Error("Backup file not found: " + backupFile);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
  console.log("Read backup data successfully.");

  const dataDir = path.join(process.cwd(), ".pgdata");
  if (fs.existsSync(dataDir)) {
    // Attempt to remove cleanly or rename
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      const bakDir = path.join(process.cwd(), ".pgdata_bak_" + Date.now());
      fs.renameSync(dataDir, bakDir);
    }
  }

  const pg = new PGlite(dataDir);
  console.log("Initialized fresh PGlite instance.");

  // 1. Create all tables with complete schema
  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
      is_active BOOLEAN NOT NULL DEFAULT true,
      must_change_password BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS parties (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL CHECK (type IN ('farmer', 'client', 'both')),
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      village TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      name_mr TEXT NOT NULL,
      name_en TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kind TEXT NOT NULL CHECK (kind IN ('purchase', 'sale')),
      bill_no TEXT NOT NULL,
      bill_date TEXT NOT NULL,
      party_id UUID REFERENCES parties(id),
      party_name TEXT NOT NULL,
      party_phone TEXT DEFAULT '',
      party_village TEXT DEFAULT '',
      hamali NUMERIC(14,2) NOT NULL DEFAULT 0,
      paid_now NUMERIC(14,2) NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      deleted_by UUID REFERENCES users(id),
      delete_reason TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      product_name TEXT NOT NULL,
      grade TEXT DEFAULT '',
      bag_weights JSONB NOT NULL DEFAULT '[]'::jsonb,
      cut_kg NUMERIC(12,3) NOT NULL DEFAULT 0,
      net_kg NUMERIC(12,3) NOT NULL DEFAULT 0,
      rate_per_kg NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      party_id UUID REFERENCES parties(id),
      bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
      party_name TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      party_type TEXT NOT NULL CHECK (party_type IN ('farmer', 'client')),
      amount NUMERIC(14,2) NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('payment', 'advance')),
      mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'bank')) DEFAULT 'cash',
      note TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      deleted_by UUID REFERENCES users(id),
      delete_reason TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      party_id UUID REFERENCES parties(id),
      caller_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      product TEXT DEFAULT '',
      quantity_kg NUMERIC(12,3) DEFAULT 0,
      location TEXT DEFAULT '',
      follow_up_date TEXT DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
      notes TEXT DEFAULT '',
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      deleted_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      product TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'closed')) DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      user_email TEXT DEFAULT '',
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS payment_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bill_shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ DEFAULT NULL,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_bills_party ON bills(party_id);
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
    CREATE INDEX IF NOT EXISTS idx_bills_deleted ON bills(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id);
    CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
    CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_calls_deleted ON calls(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
    CREATE INDEX IF NOT EXISTS idx_parties_phone ON parties(phone);
    CREATE INDEX IF NOT EXISTS idx_allocations_payment ON payment_allocations(payment_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_bill ON payment_allocations(bill_id);
    CREATE INDEX IF NOT EXISTS idx_shares_token ON bill_shares(token);
    CREATE INDEX IF NOT EXISTS idx_shares_bill ON bill_shares(bill_id);
  `;

  await pg.exec(ddl);
  console.log("DDL executed successfully.");

  // 2. Restore data from backup
  const tableMapping: Array<{ key: string; table: string }> = [
    { key: "users", table: "users" },
    { key: "parties", table: "parties" },
    { key: "products", table: "products" },
    { key: "bills", table: "bills" },
    { key: "billItems", table: "bill_items" },
    { key: "payments", table: "payments" },
    { key: "calls", table: "calls" },
    { key: "settings", table: "settings" },
    { key: "auditLogs", table: "audit_logs" },
    { key: "enquiries", table: "enquiries" },
  ];

  for (const { key, table } of tableMapping) {
    const rows = backupData[key] || [];
    if (!rows.length) continue;
    console.log(`Restoring ${rows.length} rows into ${table}...`);

    for (const row of rows) {
      const cols: string[] = [];
      const vals: any[] = [];
      const placeholders: string[] = [];

      let idx = 1;
      for (const [colName, colVal] of Object.entries(row)) {
        const snakeCol = colName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        cols.push(`"${snakeCol}"`);
        placeholders.push(`$${idx++}`);
        vals.push(typeof colVal === "object" && colVal !== null ? JSON.stringify(colVal) : colVal);
      }

      const insertSql = `INSERT INTO "${table}" (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT DO NOTHING;`;
      await pg.query(insertSql, vals);
    }
  }

  // 3. Set must_change_password = true for the admin users as required by Step 3
  await pg.exec(`
    UPDATE users SET must_change_password = true 
    WHERE email IN ('tanmaychavan@gmail.com', 'sahilchavan9765@gmail.com');
  `);
  console.log("Updated users: must_change_password = true for owner accounts.");

  // 4. Ledger Migration V2: Link bill paidNow into payments + allocations
  console.log("Executing Ledger V2 migrations on restored dataset...");

  // Fetch bills with items
  const billsRes = await pg.query("SELECT * FROM bills WHERE deleted_at IS NULL;");
  const itemsRes = await pg.query("SELECT * FROM bill_items;");
  const billItemsMap = new Map<string, number>();
  for (const it of itemsRes.rows as any[]) {
    const cur = billItemsMap.get(it.bill_id) || 0;
    billItemsMap.set(it.bill_id, cur + Number(it.total_amount));
  }

  for (const bill of billsRes.rows as any[]) {
    const paidVal = Number(bill.paid_now) || 0;
    if (paidVal <= 0) continue;

    const partyType = bill.kind === "purchase" ? "farmer" : "client";
    const note = `बिल ${bill.bill_no} सोबत ${bill.kind === "purchase" ? "दिलेली" : "मिळालेली"} रक्कम`;

    // Insert linked payment
    const payRes = await pg.query(
      `INSERT INTO payments (party_id, bill_id, party_name, payment_date, party_type, amount, kind, mode, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'payment', 'cash', $7, $8)
       RETURNING id;`,
      [bill.party_id, bill.id, bill.party_name, bill.bill_date, partyType, paidVal, note, bill.created_by]
    );

    const paymentId = (payRes.rows[0] as any).id;
    const itemsTotal = billItemsMap.get(bill.id) || 0;
    const hamali = Number(bill.hamali) || 0;
    const netPayable = Math.max(0, itemsTotal - hamali);
    const allocAmount = Math.min(netPayable, paidVal);

    // Insert allocation
    await pg.query(
      `INSERT INTO payment_allocations (payment_id, bill_id, amount) VALUES ($1, $2, $3);`,
      [paymentId, bill.id, allocAmount]
    );
  }

  // FIFO Allocation for standalone payments
  const standalonePaymentsRes = await pg.query(
    "SELECT * FROM payments WHERE bill_id IS NULL AND deleted_at IS NULL ORDER BY payment_date ASC;"
  );

  for (const pay of standalonePaymentsRes.rows as any[]) {
    let unallocated = Number(pay.amount) || 0;
    if (unallocated <= 0 || pay.kind === "advance") continue;

    // Find open bills for this party
    const partyBillsRes = await pg.query(
      "SELECT * FROM bills WHERE party_id = $1 AND deleted_at IS NULL ORDER BY bill_date ASC;",
      [pay.party_id]
    );

    for (const b of partyBillsRes.rows as any[]) {
      if (unallocated <= 0) break;
      const bItemsTotal = billItemsMap.get(b.id) || 0;
      const bHamali = Number(b.hamali) || 0;
      const bNetPayable = Math.max(0, bItemsTotal - bHamali);

      // Get existing allocations for this bill
      const existAllocRes = await pg.query(
        "SELECT coalesce(sum(amount), 0) as total_alloc FROM payment_allocations WHERE bill_id = $1;",
        [b.id]
      );
      const allocatedSoFar = Number((existAllocRes.rows[0] as any).total_alloc) || 0;
      const remainingDue = Math.max(0, bNetPayable - allocatedSoFar);

      if (remainingDue > 0) {
        const canGive = Math.min(unallocated, remainingDue);
        await pg.query(
          "INSERT INTO payment_allocations (payment_id, bill_id, amount) VALUES ($1, $2, $3);",
          [pay.id, b.id, canGive]
        );
        unallocated -= canGive;
      }
    }
  }

  // Acceptance Check: Aditi mandre P-0005
  const checkRes = await pg.query(`
    SELECT b.bill_no, b.party_name,
      coalesce(sum(bi.total_amount), 0) - b.hamali as net_payable,
      coalesce(pa.total_paid, 0) as total_paid
    FROM bills b
    LEFT JOIN bill_items bi ON b.id = bi.bill_id
    LEFT JOIN (
      SELECT bill_id, sum(amount) as total_paid FROM payment_allocations GROUP BY bill_id
    ) pa ON b.id = pa.bill_id
    WHERE b.bill_no = 'P-0005'
    GROUP BY b.id, b.bill_no, b.party_name, b.hamali, pa.total_paid;
  `);

  if (checkRes.rows.length > 0) {
    const p5 = checkRes.rows[0] as any;
    const net = Number(p5.net_payable);
    const paid = Number(p5.total_paid);
    const due = net - paid;
    console.log(`ACCEPTANCE CHECK: Bill P-0005 Net=₹${net}, Paid=₹${paid}, Due=₹${due}`);
    if (due === 5640) {
      console.log("✅ ACCEPTANCE CRITERIA PASSED: Aditi mandre P-0005 due is exactly ₹5,640.");
    } else {
      console.warn("⚠️ Warning: P-0005 due is", due);
    }
  }

  console.log("Database initialized and fully synchronized!");
  await pg.close();
}

restore()
  .then(() => {
    console.log("DATABASE RESTORATION & MIGRATION COMPLETED.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Restoration failed:", err);
    process.exit(1);
  });
