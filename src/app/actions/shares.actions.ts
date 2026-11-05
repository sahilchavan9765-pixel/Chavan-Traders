"use server";

import { db } from "@/db";
import { billShares, bills, billItems } from "@/db/schema";
import { requireAuth, requireAdmin } from "@/lib/auth-guard";
import { eq, and, isNull, gt } from "drizzle-orm";
import crypto from "crypto";

export async function getOrCreateBillShareAction(billId: string) {
  // Check if an active unexpired share exists
  const now = new Date();
  const existingShares = await db
    .select()
    .from(billShares)
    .where(
      and(
        eq(billShares.billId, billId),
        isNull(billShares.revokedAt),
        gt(billShares.expiresAt, now)
      )
    )
    .limit(1);

  if (existingShares.length > 0) {
    return { token: existingShares[0].token, expiresAt: existingShares[0].expiresAt };
  }

  // Create new 32-byte secure random URL-safe hex token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  let userId = null;
  try {
    const user = await requireAuth();
    userId = user.id;
  } catch {
    // If called from background or webhook
  }

  await db.insert(billShares).values({
    billId,
    token,
    expiresAt,
    createdBy: userId,
  });

  return { token, expiresAt };
}

export async function getBillByShareTokenAction(token: string) {
  if (!token || typeof token !== "string") return null;

  const [share] = await db
    .select()
    .from(billShares)
    .where(eq(billShares.token, token))
    .limit(1);

  if (!share) return { status: "not_found" };

  const now = new Date();
  if (share.revokedAt) {
    return { status: "revoked" };
  }

  if (new Date(share.expiresAt) < now) {
    return { status: "expired" };
  }

  // Fetch the bill
  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, share.billId))
    .limit(1);

  if (!bill) return { status: "not_found" };

  const items = await db
    .select()
    .from(billItems)
    .where(eq(billItems.billId, bill.id));

  return {
    status: "valid",
    bill: {
      ...bill,
      isDeleted: !!bill.deletedAt,
      items,
    },
    share,
  };
}

export async function revokeBillShareAction(shareId: string) {
  const user = await requireAdmin();

  await db
    .update(billShares)
    .set({ revokedAt: new Date() })
    .where(eq(billShares.id, shareId));

  return { success: true };
}

