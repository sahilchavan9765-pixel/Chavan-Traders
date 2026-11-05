import { db } from "../src/db";
import { users, bills, billItems, payments, paymentAllocations, billShares } from "../src/db/schema";
import { eq, or } from "drizzle-orm";

async function cleanup() {
  console.log("Cleaning up E2E test data...");

  // Find e2e admin user
  const [e2eUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "e2e_admin@chavantraders.test"));

  if (e2eUser) {
    // Delete bills created by e2e user or test farmer
    const testBills = await db
      .select()
      .from(bills)
      .where(or(eq(bills.createdBy, e2eUser.id), eq(bills.partyName, "बाळासो माने")));

    for (const b of testBills) {
      await db.delete(paymentAllocations).where(eq(paymentAllocations.billId, b.id));
      await db.delete(billShares).where(eq(billShares.billId, b.id));
      await db.delete(billItems).where(eq(billItems.billId, b.id));
      await db.delete(payments).where(eq(payments.billId, b.id));
      await db.delete(bills).where(eq(bills.id, b.id));
    }

    // Delete e2e test tokens
    await db.delete(billShares).where(eq(billShares.createdBy, e2eUser.id));

    // Delete e2e admin user
    await db.delete(users).where(eq(users.id, e2eUser.id));
    console.log("Deleted E2E test user and test records.");
  }

  // Also ensure both real owner accounts have must_change_password = true as required
  await db
    .update(users)
    .set({ mustChangePassword: true })
    .where(or(eq(users.email, "tanmaychavan@gmail.com"), eq(users.email, "sahilchavan9765@gmail.com")));

  console.log("✅ Verified: Both owner accounts require password change on first login.");
}

cleanup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  });

