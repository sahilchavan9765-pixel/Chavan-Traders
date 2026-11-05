import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

async function executeQuery(sqlText: string, params: any[] = []) {
  if (connUrl && connUrl.startsWith("postgres") && !connUrl.includes("placeholder")) {
    const { neon } = require("@neondatabase/serverless");
    const sql = neon(connUrl);
    if (params.length > 0) {
      return await sql(sqlText, params);
    }
    return await sql(sqlText);
  } else {
    const { PGlite } = require("@electric-sql/pglite");
    const dataDir = path.join(process.cwd(), ".pgdata");
    const pg = new PGlite(dataDir);
    let res;
    if (params.length > 0) {
      res = await pg.query(sqlText, params);
    } else {
      res = await pg.exec(sqlText);
    }
    await pg.close();
    return res;
  }
}

export async function runRestore() {
  console.log("Starting database rebuild & restore...");

  const dataDir = path.join(process.cwd(), ".pgdata");

  // If local PGlite and dataDir exists, backup and start clean
  if (!connUrl || !connUrl.startsWith("postgres") || connUrl.includes("placeholder")) {
    if (fs.existsSync(dataDir)) {
      const bakDir = path.join(process.cwd(), `.pgdata_corrupt_${Date.now()}`);
      console.log(`Moving corrupted .pgdata to ${bakDir}...`);
      try {
        fs.renameSync(dataDir, bakDir);
      } catch (e) {
        console.error("Could not rename .pgdata, attempting cleanup:", e);
      }
    }
  }

  const { PGlite } = require("@electric-sql/pglite");
  const pg = new PGlite(dataDir);

  // 1. Run complete DDL
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

    CREATE TABLE IF NOT EXISTS payment_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
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

    CREATE TABLE IF NOT EXISTS bill_shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ DEFAULT NULL,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product TEXT NOT NULL,
      date TEXT NOT NULL,
      kg_change NUMERIC(12,3) NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('wastage', 'moisture_loss', 'correction', 'opening_stock')),
      note TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_stock_adj_prod ON stock_adjustments(product);
  `;

  await pg.exec(ddl);
  console.log("DDL applied successfully.");

  // 2. Read backup file
  const backupPath = path.join(process.cwd(), "backups", "backup-2026-11-04T05-48-19-216Z.json");
  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

  // Restore Users
  for (const u of backupData.users || []) {
    await pg.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, must_change_password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email, u.passwordHash, u.fullName, u.role, u.isActive, u.mustChangePassword, u.createdAt, u.updatedAt]
    );
  }

  // Restore Parties
  for (const p of backupData.parties || []) {
    await pg.query(
      `INSERT INTO parties (id, type, name, phone, village, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.type, p.name, p.phone, p.village, p.notes, p.createdAt, p.updatedAt]
    );
  }

  // Restore Products
  for (const pr of backupData.products || []) {
    await pg.query(
      `INSERT INTO products (id, code, name_mr, name_en, sort_order, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [pr.id, pr.code, pr.nameMr, pr.nameEn, pr.sortOrder, pr.active, pr.createdAt]
    );
  }

  // Restore Bills
  for (const b of backupData.bills || []) {
    await pg.query(
      `INSERT INTO bills (id, kind, bill_no, bill_date, party_id, party_name, party_phone, party_village, hamali, paid_now, note, created_by, deleted_at, deleted_by, delete_reason, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO NOTHING`,
      [b.id, b.kind, b.billNo, b.billDate, b.partyId, b.partyName, b.partyPhone, b.partyVillage, b.hamali, b.paidNow, b.note, b.createdBy, b.deletedAt, b.deletedBy, b.deleteReason, b.createdAt, b.updatedAt]
    );
  }

  // Restore Bill Items
  for (const bi of backupData.billItems || []) {
    await pg.query(
      `INSERT INTO bill_items (id, bill_id, product_id, product_name, grade, bag_weights, cut_kg, net_kg, rate_per_kg, total_amount, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [bi.id, bi.billId, bi.productId, bi.productName, bi.grade, JSON.stringify(bi.bagWeights || []), bi.cutKg, bi.netKg, bi.ratePerKg, bi.totalAmount, bi.createdAt]
    );
  }

  // Restore Payments
  for (const pay of backupData.payments || []) {
    await pg.query(
      `INSERT INTO payments (id, party_id, bill_id, party_name, payment_date, party_type, amount, kind, mode, note, created_by, deleted_at, deleted_by, delete_reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO NOTHING`,
      [pay.id, pay.partyId, pay.billId, pay.partyName, pay.paymentDate, pay.partyType, pay.amount, pay.kind, pay.mode, pay.note, pay.createdBy, pay.deletedAt, pay.deletedBy, pay.deleteReason, pay.createdAt]
    );
  }

  // Restore Payment Allocations
  for (const pa of backupData.paymentAllocations || []) {
    await pg.query(
      `INSERT INTO payment_allocations (id, payment_id, bill_id, amount, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [pa.id, pa.paymentId, pa.billId, pa.amount, pa.createdAt]
    );
  }

  // Restore Calls
  for (const c of backupData.calls || []) {
    await pg.query(
      `INSERT INTO calls (id, party_id, caller_name, phone, product, quantity_kg, location, follow_up_date, status, notes, deleted_at, deleted_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.partyId, c.callerName, c.phone, c.product, c.quantityKg, c.location, c.followUpDate, c.status, c.notes, c.deletedAt, c.deletedBy, c.createdAt]
    );
  }

  // Restore Settings
  for (const s of backupData.settings || []) {
    await pg.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3`,
      [s.key, JSON.stringify(s.value), s.updatedAt]
    );
  }

  // Restore Audit Logs
  for (const a of backupData.auditLogs || []) {
    await pg.query(
      `INSERT INTO audit_logs (id, user_id, user_email, action, entity, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.userId, a.userEmail, a.action, a.entity, a.entityId, JSON.stringify(a.details || {}), a.createdAt]
    );
  }

  // Restore Enquiries
  for (const e of backupData.enquiries || []) {
    await pg.query(
      `INSERT INTO enquiries (id, name, phone, product, message, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [e.id, e.name, e.phone, e.product, e.message, e.status, e.createdAt]
    );
  }

  // Verify counts
  const tables = ["users", "parties", "products", "bills", "bill_items", "payments", "payment_allocations", "calls", "settings", "audit_logs", "enquiries", "stock_adjustments"];
  const counts: Record<string, number> = {};
  for (const tbl of tables) {
    const res = await pg.query(`SELECT count(*)::int as cnt FROM ${tbl}`);
    counts[tbl] = res.rows[0].cnt;
  }
  console.log("Restoration Complete! Verified table counts:", counts);
  await pg.close();
}

if (require.main === module) {
  runRestore().catch(console.error);
}

