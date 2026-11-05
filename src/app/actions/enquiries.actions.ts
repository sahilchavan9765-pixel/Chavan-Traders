"use server";

import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { requireAuth, logAudit } from "@/lib/auth-guard";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getEnquiriesAction() {
  await requireAuth();

  return await db
    .select()
    .from(enquiries)
    .orderBy(desc(enquiries.createdAt));
}

export async function updateEnquiryStatusAction(
  id: string,
  status: "new" | "contacted" | "closed"
) {
  const user = await requireAuth();

  await db
    .update(enquiries)
    .set({ status })
    .where(eq(enquiries.id, id));

  await logAudit(user, "UPDATE_STATUS", "enquiries", id, { status });

  revalidatePath("/app");
  revalidatePath("/app/enquiries");

  return { success: true };
}

export async function deleteEnquiryAction(id: string) {
  const user = await requireAuth();

  await db.delete(enquiries).where(eq(enquiries.id, id));

  await logAudit(user, "DELETE", "enquiries", id, {});

  revalidatePath("/app");
  revalidatePath("/app/enquiries");

  return { success: true };
}


