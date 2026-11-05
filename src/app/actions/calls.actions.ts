"use server";

import { db } from "@/db";
import { calls } from "@/db/schema";
import { requireAuth, requireAdmin, logAudit } from "@/lib/auth-guard";
import { eq, desc, isNull, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CreateCallInput {
  callerName: string;
  phone?: string;
  product?: string;
  quantityKg?: number;
  location?: string;
  followUpDate?: string;
  notes?: string;
}

export async function getCallsAction(includeDeleted = false) {
  const user = await requireAuth();

  const conditions = [];
  if (!includeDeleted || user.role !== "admin") {
    conditions.push(isNull(calls.deletedAt));
  }

  const rows = await db
    .select()
    .from(calls)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(calls.createdAt));

  return rows.map((c: any) => ({
    ...c,
    isDeleted: !!c.deletedAt,
  }));
}

export async function createCallAction(data: CreateCallInput) {
  const user = await requireAuth();

  if (!data.callerName.trim()) {
    throw new Error("Caller name is required.");
  }

  const [newCall] = await db
    .insert(calls)
    .values({
      callerName: data.callerName.trim(),
      phone: (data.phone || "").trim(),
      product: data.product || "",
      quantityKg: (Number(data.quantityKg) || 0).toString(),
      location: data.location || "",
      followUpDate: data.followUpDate || "",
      status: "pending",
      notes: data.notes || "",
    })
    .returning();

  await logAudit(user, "CREATE", "calls", newCall.id, {
    callerName: data.callerName,
    product: data.product,
  });

  revalidatePath("/app");
  revalidatePath("/app/calls");

  return { success: true, callId: newCall.id };
}

export async function toggleCallStatusAction(id: string, newStatus: "pending" | "completed") {
  const user = await requireAuth();

  await db
    .update(calls)
    .set({ status: newStatus })
    .where(eq(calls.id, id));

  await logAudit(user, "UPDATE_STATUS", "calls", id, { status: newStatus });

  revalidatePath("/app");
  revalidatePath("/app/calls");

  return { success: true };
}

export async function deleteCallAction(id: string) {
  const user = await requireAuth();

  await db
    .update(calls)
    .set({
      deletedAt: new Date(),
      deletedBy: user.id,
    })
    .where(eq(calls.id, id));

  await logAudit(user, "SOFT_DELETE", "calls", id);

  revalidatePath("/app");
  revalidatePath("/app/calls");

  return { success: true };
}

export async function restoreCallAction(id: string) {
  const user = await requireAdmin();

  await db
    .update(calls)
    .set({
      deletedAt: null,
      deletedBy: null,
    })
    .where(eq(calls.id, id));

  await logAudit(user, "RESTORE", "calls", id);

  revalidatePath("/app");
  revalidatePath("/app/calls");

  return { success: true };
}
