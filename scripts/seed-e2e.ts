import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";

async function seedE2E() {
  const pg = new PGlite(".pgdata");
  const e2eEmail = process.env.E2E_ADMIN_EMAIL || "e2e_admin@chavantraders.test";
  const e2ePassword = process.env.E2E_ADMIN_PASSWORD || "E2E_Secure@Test2026!";
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(e2ePassword, salt);

  // 1. Ensure test admin exists
  await pg.query(
    `INSERT INTO users (id, email, password_hash, full_name, role, is_active, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3, must_change_password = false`,
    [
      "00000000-0000-0000-0000-000000000001",
      e2eEmail,
      hash,
      "E2E Admin Tester",
      "admin",
      true,
      false,
    ]
  );
  console.log("Seeded e2e_admin user.");

  // 2. Ensure test bill and token exist for /b/[token]
  const bills = await pg.query("SELECT id FROM bills LIMIT 1");
  if (bills.rows.length > 0) {
    const billId = (bills.rows[0] as any).id;
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 1000).toISOString();

    await pg.query(
      `INSERT INTO bill_shares (id, bill_id, token, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token) DO NOTHING`,
      [
        "00000000-0000-0000-0000-000000000002",
        billId,
        "e2e-valid-token-32bytes-secure-hash",
        futureDate,
        "00000000-0000-0000-0000-000000000001",
      ]
    );

    await pg.query(
      `INSERT INTO bill_shares (id, bill_id, token, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token) DO NOTHING`,
      [
        "00000000-0000-0000-0000-000000000003",
        billId,
        "e2e-expired-token-32bytes-hash",
        pastDate,
        "00000000-0000-0000-0000-000000000001",
      ]
    );
    console.log("Seeded test tokens.");
  }

  await pg.close();
}

seedE2E().catch(console.error);

