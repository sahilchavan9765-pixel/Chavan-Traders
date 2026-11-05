#!/usr/bin/env node
/**
 * db:import — Imports data from a PGlite JSON backup into the Neon database.
 *
 * Usage:  node scripts/db-import.mjs backups/backup-2026-11-04T10-18-18-93Z.json
 * Env:    DATABASE_URL  (direct / non-pooled connection)
 *
 * - Loads .env.local via dotenv
 * - Reads the JSON backup file
 * - Skips rows that already exist (by primary key)
 * - Prints before/after row counts
 * - Exits 0 on success, exits 1 on failure
 *
 * SAFE TO RE-RUN: uses INSERT ... ON CONFLICT (id) DO NOTHING
 */

import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[db:import] ❌  DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const backupFile = process.argv[2];
if (!backupFile) {
  console.error("[db:import] ❌  Usage: node scripts/db-import.mjs <backup.json>");
  process.exit(1);
}

const backup = JSON.parse(readFileSync(path.resolve(backupFile), "utf-8"));

function camelToSnake(str) {
  return str.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
}

function toSnakeRecord(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = v;
  }
  return out;
}

// Map backup key → table name + primary key
const TABLE_MAP = {
  users:        { table: "users",        pk: "id" },
  parties:      { table: "parties",      pk: "id" },
  products:     { table: "products",     pk: "id" },
  bills:        { table: "bills",        pk: "id" },
  billItems:    { table: "bill_items",   pk: "id" },
  payments:     { table: "payments",     pk: "id" },
  calls:        { table: "calls",        pk: "id" },
  enquiries:    { table: "enquiries",    pk: "id" },
  billShares:   { table: "bill_shares",  pk: "id" },
  auditLogs:    { table: "audit_logs",   pk: "id" },
};

async function countRows(sql, table) {
  const r = await sql`SELECT COUNT(*)::int AS n FROM ${sql(table)}`;
  return r[0]?.n ?? 0;
}

function padEnd(str, len) { return String(str).padEnd(len, " "); }

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

async function main() {
  console.log("[db:import] Connecting to Neon...");
  const sql = postgres(databaseUrl, { ssl: "require", max: 1, idle_timeout: 20, connect_timeout: 30 });

  try {
    // Before counts
    console.log("[db:import] Fetching before counts...");
    const beforeRows = [];
    for (const [bKey, { table }] of Object.entries(TABLE_MAP)) {
      const before = await countRows(sql, table);
      beforeRows.push({ bKey, table, before });
    }

    let totalInserted = 0;

    await sql.begin(async (tx) => {
      for (const [bKey, { table }] of Object.entries(TABLE_MAP)) {
        const rows = backup[bKey];
        if (!Array.isArray(rows) || rows.length === 0) {
          console.log(`[db:import]   ${table}: no rows in backup, skipping`);
          continue;
        }

        let inserted = 0;
        for (const row of rows) {
          const snakeRow = toSnakeRecord(row);
          // Convert camelCase hash fields
          if (snakeRow.password_hash === undefined && row.passwordHash) {
            snakeRow.password_hash = row.passwordHash;
          }
          // Remove unknown/extra keys that might not exist in Neon schema
          // We'll just try and let ON CONFLICT handle duplicates
          try {
            const cols = Object.keys(snakeRow);
            const vals = Object.values(snakeRow);
            await tx.unsafe(
              `INSERT INTO ${table} (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${cols.map((_, i) => `$${i+1}`).join(", ")}) ON CONFLICT (id) DO NOTHING`,
              vals
            );
            inserted++;
          } catch (err) {
            console.warn(`[db:import]   WARN ${table} row ${snakeRow.id}: ${err.message}`);
          }
        }
        totalInserted += inserted;
        console.log(`[db:import]   ${table}: ${inserted}/${rows.length} rows processed`);
      }
    });

    // After counts
    console.log("\n[db:import] Row count summary:");
    const summaryRows = [];
    for (const { bKey, table, before } of beforeRows) {
      const after = await countRows(sql, table);
      const added = after - before;
      summaryRows.push([table, String(before), String(after), added > 0 ? `+${added}` : "0"]);
    }
    printTable(["Table", "Before", "After", "Added"], summaryRows);

    console.log(`\n[db:import] ✅ Done. ${totalInserted} rows processed.\n`);
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error("\n[db:import] ❌ Import failed:", err?.message || err);
    if (err?.detail) console.error("             Detail:", err.detail);
    try { await sql.end(); } catch {}
    process.exit(1);
  }
}

main();

