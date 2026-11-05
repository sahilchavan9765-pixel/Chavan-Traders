import { db } from "../src/db";
import { users, billShares, bills } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function setupE2ETestData() {
  const e2eEmail = process.env.E2E_ADMIN_EMAIL || "e2e_admin@chavantraders.test";
  const e2ePassword = process.env.E2E_ADMIN_PASSWORD || "E2E_Secure@Test2026!";
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(e2ePassword, salt);

  // 1. Create or update E2E test admin user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, e2eEmail));

  let e2eUserId: string;
  if (!existing) {
    const [created] = await db
      .insert(users)
      .values({
        email: e2eEmail,
        passwordHash: hash,
        fullName: "E2E Test Admin",
        role: "admin",
        isActive: true,
        mustChangePassword: false,
      })
      .returning();
    e2eUserId = created.id;
  } else {
    await db
      .update(users)
      .set({ passwordHash: hash, mustChangePassword: false, isActive: true })
      .where(eq(users.id, existing.id));
    e2eUserId = existing.id;
  }

  // 2. Create sample share token for /b/[token] test
  const [firstBill] = await db.select().from(bills).limit(1);
  if (firstBill) {
    const validToken = "e2e-valid-token-32bytes-secure-hash";
    const expiredToken = "e2e-expired-token-32bytes-hash";

    await db.insert(billShares).values([
      {
        billId: firstBill.id,
        token: validToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: e2eUserId,
      },
      {
        billId: firstBill.id,
        token: expiredToken,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        createdBy: e2eUserId,
      },
    ]).onConflictDoNothing();
  }

  console.log("E2E Test Admin and Tokens seeded successfully.");
}

if (require.main === module) {
  setupE2ETestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

