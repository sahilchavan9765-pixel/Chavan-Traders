#!/usr/bin/env node
/**
 * db:migrate — Applies all schema changes to the Neon (PostgreSQL) database.
 *
 * Usage:  node scripts/db-migrate.mjs
 * Env:    DATABASE_URL  (direct / non-pooled connection)
 *
 * - Loads .env.local via dotenv
 * - Runs all CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, indexes, seeds
 * - Prints a before/after row count table
 * - Exits 0 on success, exits 1 on failure
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// ── Load .env.local ────────────────────────────────────────────────────────────
dotenv.config({ path: path.join(root, ".env.local") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "[db:migrate] ❌  DATABASE_URL is not set.\n" +
    "             Add it to .env.local (direct / non-pooled Neon connection string).\n" +
    "             See .env.example for the format."
  );
  process.exit(1);
}

// ── Tables we track for before/after counts ────────────────────────────────────
const TRACKED_TABLES = [
  "users", "parties", "products", "bills", "bill_items",
  "payments", "calls", "enquiries", "settings", "counters",
  "audit_logs", "payment_allocations", "bill_shares", "stock_adjustments",
];

// ── SQL: CREATE TABLE statements (match src/db/schema.ts exactly) ─────────────
const CREATE_TABLES_SQL = `
-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. parties
CREATE TABLE IF NOT EXISTS parties (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL CHECK (type IN ('farmer','client','both')),
  name       TEXT NOT NULL,
  phone      TEXT DEFAULT '',
  village    TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. products
CREATE TABLE IF NOT EXISTS products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL,
  name_mr    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. bills
CREATE TABLE IF NOT EXISTS bills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL CHECK (kind IN ('purchase','sale')),
  bill_no       TEXT NOT NULL,
  bill_date     TEXT NOT NULL,
  party_id      UUID REFERENCES parties(id),
  party_name    TEXT NOT NULL,
  party_phone   TEXT DEFAULT '',
  party_village TEXT DEFAULT '',
  hamali        NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_now      NUMERIC(14,2) NOT NULL DEFAULT 0,
  note          TEXT DEFAULT '',
  created_by    UUID REFERENCES users(id),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID REFERENCES users(id),
  delete_reason TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. bill_items
CREATE TABLE IF NOT EXISTS bill_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id      UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  grade        TEXT DEFAULT '',
  bag_weights  JSONB NOT NULL DEFAULT '[]',
  cut_kg       NUMERIC(12,3) NOT NULL DEFAULT 0,
  net_kg       NUMERIC(12,3) NOT NULL DEFAULT 0,
  rate_per_kg  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. payments
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id      UUID REFERENCES parties(id),
  bill_id       UUID REFERENCES bills(id) ON DELETE SET NULL,
  party_name    TEXT NOT NULL,
  payment_date  TEXT NOT NULL,
  party_type    TEXT NOT NULL CHECK (party_type IN ('farmer','client')),
  amount        NUMERIC(14,2) NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('payment','advance')),
  direction     TEXT NOT NULL DEFAULT 'OUT' CHECK (direction IN ('IN','OUT')),
  mode          TEXT NOT NULL DEFAULT 'cash' CHECK (mode IN ('cash','upi','bank','cheque')),
  reference_no  TEXT DEFAULT '',
  voucher_no    TEXT DEFAULT '',
  handled_by    TEXT DEFAULT '',
  paid_by_name  TEXT DEFAULT '',
  timing_tag    TEXT NOT NULL DEFAULT 'with_bill' CHECK (timing_tag IN ('with_bill','later','advance')),
  note          TEXT DEFAULT '',
  created_by    UUID REFERENCES users(id),
  recorded_by   UUID REFERENCES users(id),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID REFERENCES users(id),
  delete_reason TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. calls
CREATE TABLE IF NOT EXISTS calls (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id       UUID REFERENCES parties(id),
  caller_name    TEXT NOT NULL,
  phone          TEXT DEFAULT '',
  product        TEXT DEFAULT '',
  quantity_kg    NUMERIC(12,3) DEFAULT 0,
  location       TEXT DEFAULT '',
  follow_up_date TEXT DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  notes          TEXT DEFAULT '',
  deleted_at     TIMESTAMPTZ,
  deleted_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. enquiries
CREATE TABLE IF NOT EXISTS enquiries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  product    TEXT NOT NULL,
  message    TEXT DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. settings
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  user_email TEXT DEFAULT '',
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT DEFAULT '',
  details    JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. payment_allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  bill_id    UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  amount     NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. bill_shares
CREATE TABLE IF NOT EXISTS bill_shares (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id    UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. counters
CREATE TABLE IF NOT EXISTS counters (
  key      TEXT PRIMARY KEY,
  next_val INTEGER NOT NULL DEFAULT 1
);

-- 14. stock_adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product    TEXT NOT NULL,
  date       TEXT NOT NULL,
  kg_change  NUMERIC(12,3) NOT NULL,
  reason     TEXT NOT NULL CHECK (reason IN ('wastage','moisture_loss','correction','opening_stock')),
  note       TEXT DEFAULT '',
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

// ── SQL: ADD COLUMN IF NOT EXISTS (safe to re-run) ────────────────────────────
const ADD_COLUMNS_SQL = [
  // bills extras
  `ALTER TABLE bills ADD COLUMN IF NOT EXISTS party_phone TEXT DEFAULT ''`,
  `ALTER TABLE bills ADD COLUMN IF NOT EXISTS party_village TEXT DEFAULT ''`,
  `ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id)`,
  `ALTER TABLE bills ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT ''`,
  `ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  // bill_items extras
  `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id)`,
  `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT ''`,
  // payments extras
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES parties(id)`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id) ON DELETE SET NULL`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS party_type TEXT NOT NULL DEFAULT 'farmer'`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'OUT'`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'cash'`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_no TEXT DEFAULT ''`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS voucher_no TEXT DEFAULT ''`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS handled_by TEXT DEFAULT ''`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_by_name TEXT DEFAULT ''`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS timing_tag TEXT NOT NULL DEFAULT 'with_bill'`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id)`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id)`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT ''`,
  // calls extras
  `ALTER TABLE calls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
  `ALTER TABLE calls ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id)`,
];

// ── SQL: Indexes ───────────────────────────────────────────────────────────────
const INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_bills_party_id ON bills(party_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_kind ON bills(kind)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_deleted_at ON bills(deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_party_id ON payments(party_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_party_type ON payments(party_type)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_calls_party_id ON calls(party_id)`,
  `CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status)`,
  `CREATE INDEX IF NOT EXISTS idx_calls_deleted_at ON calls(deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payment_allocations_bill ON payment_allocations(bill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bill_shares_token ON bill_shares(token)`,
  `CREATE INDEX IF NOT EXISTS idx_bill_shares_bill ON bill_shares(bill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON stock_adjustments(date)`,
];

// ── SQL: Default settings seed ─────────────────────────────────────────────────
const SEED_SETTINGS_SQL = `
INSERT INTO settings (key, value, updated_at)
SELECT * FROM (VALUES
  ('firm_name',        '"Chavan Traders"'::jsonb,          now()),
  ('firm_name_mr',     '"चव्हाण ट्रेडर्स"'::jsonb,       now()),
  ('firm_address',     '"Pune, Maharashtra"'::jsonb,       now()),
  ('firm_phone',       '""'::jsonb,                        now()),
  ('firm_gstin',       '""'::jsonb,                        now()),
  ('mandi_name',       '""'::jsonb,                        now()),
  ('mandi_license_no', '""'::jsonb,                        now()),
  ('default_hamali',   '0'::jsonb,                         now()),
  ('bill_prefix_purchase', '"PB"'::jsonb,                  now()),
  ('bill_prefix_sale',     '"SB"'::jsonb,                  now())
) AS seed(key, value, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function padEnd(str, len) {
  return String(str).padEnd(len, " ");
}

function padStart(str, len) {
  return String(str).padStart(len, " ");
}

function printTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i]).length))
  );
  const sep = widths.map((w) => "-".repeat(w + 2)).join("+");
  const header = headers.map((h, i) => " " + padEnd(h, widths[i]) + " ").join("|");
  console.log("+" + sep + "+");
  console.log("|" + header + "|");
  console.log("+" + sep + "+");
  for (const row of rows) {
    const line = row.map((cell, i) => " " + padEnd(cell, widths[i]) + " ").join("|");
    console.log("|" + line + "|");
  }
  console.log("+" + sep + "+");
}

async function getRowCounts(sql, tables) {
  const counts = {};
  for (const t of tables) {
    try {
      const rows = await sql`SELECT COUNT(*)::int AS n FROM ${sql(t)}`;
      counts[t] = rows[0]?.n ?? 0;
    } catch {
      counts[t] = "N/A";
    }
  }
  return counts;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[db:migrate] Connecting to DATABASE_URL...");

  const sql = postgres(databaseUrl, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
  });

  try {
    // --- Before counts ---
    console.log("[db:migrate] Fetching before row counts...");
    const before = await getRowCounts(sql, TRACKED_TABLES);

    // --- Run everything in a transaction ---
    console.log("[db:migrate] Applying schema (CREATE TABLE IF NOT EXISTS)...");
    await sql.begin(async (tx) => {
      // 1. Create tables
      await tx.unsafe(CREATE_TABLES_SQL);

      // 2. Add missing columns
      for (const stmt of ADD_COLUMNS_SQL) {
        await tx.unsafe(stmt);
      }

      // 3. Indexes
      for (const stmt of INDEXES_SQL) {
        await tx.unsafe(stmt);
      }

      // 4. Seed default settings
      await tx.unsafe(SEED_SETTINGS_SQL);
    });

    console.log("[db:migrate] ✅ Schema applied successfully.");

    // --- After counts ---
    console.log("[db:migrate] Fetching after row counts...");
    const after = await getRowCounts(sql, TRACKED_TABLES);

    // --- Print summary table ---
    const rows = TRACKED_TABLES.map((t) => [t, String(before[t]), String(after[t])]);
    printTable(["Table", "Before", "After"], rows);
    console.log("\n[db:migrate] ✅ Done. All migrations applied.\n");

    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error("\n[db:migrate] ❌ Migration failed:", err?.message || err);
    if (err?.detail) console.error("             Detail:", err.detail);
    try { await sql.end(); } catch {}
    process.exit(1);
  }
}

main();
