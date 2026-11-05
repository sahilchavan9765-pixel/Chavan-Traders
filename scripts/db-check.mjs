#!/usr/bin/env node
/**
 * db:check — Verifies that all expected tables and critical columns exist in Neon.
 *
 * Usage:  node scripts/db-check.mjs
 * Env:    DATABASE_URL_POOLED  (pooled / http connection string)
 *
 * - Loads .env.local via dotenv
 * - If DATABASE_URL_POOLED is missing → prints clear error and exits 1
 * - Connects to Neon via @neondatabase/serverless
 * - Checks every expected table and column
 * - Prints a summary table: Table | Expected Columns | Status
 * - Exits 0 if all good, exits 1 if anything is missing
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// ── Load .env.local ────────────────────────────────────────────────────────────
dotenv.config({ path: path.join(root, ".env.local") });

const pooledUrl = process.env.DATABASE_URL_POOLED;

if (!pooledUrl) {
  console.error(
    "\n[db:check] ❌  DATABASE_URL_POOLED is not set.\n" +
    "           Add it to .env.local — see .env.example for the format.\n" +
    "           Example: DATABASE_URL_POOLED=postgresql://<user>:<pass>@<ep-pooler-host>.neon.tech/<dbname>?sslmode=require\n"
  );
  process.exit(1);
}

// ── Expected schema: table → required columns ──────────────────────────────────
const EXPECTED = {
  users: [
    "id", "email", "password_hash", "full_name", "role",
    "is_active", "must_change_password", "created_at", "updated_at",
  ],
  parties: [
    "id", "type", "name", "phone", "village", "notes",
    "created_at", "updated_at",
  ],
  products: [
    "id", "code", "name_mr", "name_en", "sort_order", "active", "created_at",
  ],
  bills: [
    "id", "kind", "bill_no", "bill_date", "party_id", "party_name",
    "party_phone", "party_village", "hamali", "paid_now", "note",
    "created_by", "deleted_at", "deleted_by", "delete_reason",
    "created_at", "updated_at",
  ],
  bill_items: [
    "id", "bill_id", "product_id", "product_name", "grade",
    "bag_weights", "cut_kg", "net_kg", "rate_per_kg", "total_amount", "created_at",
  ],
  payments: [
    "id", "party_id", "bill_id", "party_name", "payment_date", "party_type",
    "amount", "kind", "direction", "mode", "reference_no", "voucher_no",
    "handled_by", "paid_by_name", "timing_tag", "note",
    "created_by", "recorded_by", "deleted_at", "deleted_by", "delete_reason", "created_at",
  ],
  calls: [
    "id", "party_id", "caller_name", "phone", "product",
    "quantity_kg", "location", "follow_up_date", "status", "notes",
    "deleted_at", "deleted_by", "created_at",
  ],
  enquiries: [
    "id", "name", "phone", "product", "message", "status", "created_at",
  ],
  settings: ["key", "value", "updated_at"],
  audit_logs: [
    "id", "user_id", "user_email", "action", "entity",
    "entity_id", "details", "created_at",
  ],
  payment_allocations: ["id", "payment_id", "bill_id", "amount", "created_at"],
  bill_shares: [
    "id", "bill_id", "token", "expires_at", "revoked_at",
    "created_by", "created_at",
  ],
  counters: ["key", "next_val"],
  stock_adjustments: [
    "id", "product", "date", "kg_change", "reason",
    "note", "created_by", "deleted_at", "created_at",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function padEnd(str, len) {
  return String(str).padEnd(len, " ");
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[db:check] Checking Neon schema via DATABASE_URL_POOLED...\n");

  const sql = neon(pooledUrl);

  // Fetch all columns in one query for efficiency
  let tableRows;
  let columnRows;
  try {
    tableRows = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    columnRows = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;
  } catch (err) {
    console.error("[db:check] ❌  Failed to query information_schema:", err?.message || err);
    console.error("           Is DATABASE_URL_POOLED correct and reachable?");
    process.exit(1);
  }

  const existingTables = new Set(tableRows.map((r) => r.table_name));

  /** @type {Map<string, Set<string>>} */
  const existingColumns = new Map();
  for (const r of columnRows) {
    if (!existingColumns.has(r.table_name)) existingColumns.set(r.table_name, new Set());
    existingColumns.get(r.table_name).add(r.column_name);
  }

  const summaryRows = [];
  const allMissing = [];

  for (const [table, cols] of Object.entries(EXPECTED)) {
    const tableExists = existingTables.has(table);
    if (!tableExists) {
      summaryRows.push([table, String(cols.length), "❌ TABLE MISSING"]);
      allMissing.push(`TABLE MISSING: ${table}`);
      continue;
    }

    const existing = existingColumns.get(table) ?? new Set();
    const missingCols = cols.filter((c) => !existing.has(c));

    if (missingCols.length === 0) {
      summaryRows.push([table, String(cols.length), "✅ OK"]);
    } else {
      summaryRows.push([
        table,
        String(cols.length),
        `❌ MISSING: ${missingCols.join(", ")}`,
      ]);
      for (const col of missingCols) {
        allMissing.push(`COLUMN MISSING: ${table}.${col}`);
      }
    }
  }

  printTable(["Table", "Expected Cols", "Status"], summaryRows);

  if (allMissing.length === 0) {
    console.log("\n[db:check] ✅ Schema OK — all tables and columns present.\n");
    process.exit(0);
  } else {
    console.error("\n[db:check] ❌ Schema mismatch — migrations pending:\n");
    for (const item of allMissing) {
      console.error("  •", item);
    }
    console.error(
      "\n  → Run:  npm run db:migrate\n" +
      "    to apply the missing schema changes.\n"
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[db:check] Fatal:", err?.message || err);
  process.exit(1);
});
