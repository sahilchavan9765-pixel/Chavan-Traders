"use server";

import { db, waitForMigrations } from "@/db";
import { bills, billItems, parties, payments, calls, settings, paymentAllocations } from "@/db/schema";
import { requireAuth, requireAdmin, logAudit } from "@/lib/auth-guard";
import {
  parseBagWeights,
  calculateGrossWeight,
  calculateNetWeight,
  calculateItemTotal,
} from "@/lib/calculations";
import { buildPartyLedger } from "@/lib/ledger";
import { eq, desc, isNull, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CreateBillItemInput {
  productId?: string;
  productName: string;
  grade?: string;
  bagWeightsInput: string; // "45 46 44" or "45+46+44"
  cutKg: number;
  ratePerKg: number;
}

export interface CreateBillInput {
  kind: "purchase" | "sale";
  billDate: string; // YYYY-MM-DD
  partyName: string;
  partyPhone?: string;
  partyVillage?: string;
  hamali?: number;
  paidNow?: number;
  note?: string;
  items: CreateBillItemInput[];
}

export async function getBillsAction(
  kind?: "purchase" | "sale",
  includeDeleted = false
) {
  const user = await requireAuth();

  const conditions = [];
  if (!includeDeleted || user.role !== "admin") {
    conditions.push(isNull(bills.deletedAt));
  }
  if (kind) {
    conditions.push(eq(bills.kind, kind));
  }

  const billRows = await db
    .select()
    .from(bills)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bills.createdAt));

  const allItems = await db.select().from(billItems);
  const itemsByBill = new Map<string, any[]>();
  for (const it of allItems) {
    const list = itemsByBill.get(it.billId) || [];
    list.push(it);
    itemsByBill.set(it.billId, list);
  }

  // Active payment allocations
  const activeAllocs = await db
    .select({
      id: paymentAllocations.id,
      billId: paymentAllocations.billId,
      amount: paymentAllocations.amount,
      paymentId: paymentAllocations.paymentId,
      deletedAt: payments.deletedAt,
    })
    .from(paymentAllocations)
    .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
    .where(isNull(payments.deletedAt));

  const allocsByBill = new Map<string, number>();
  for (const a of activeAllocs) {
    allocsByBill.set(a.billId, (allocsByBill.get(a.billId) || 0) + Number(a.amount));
  }

  return billRows.map((bill: typeof bills.$inferSelect) => {
    const items = itemsByBill.get(bill.id) || [];
    const itemsTotal = items.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0);
    const hamali = Number(bill.hamali || 0);
    const netTotal = Math.max(0, itemsTotal - hamali);
    const paidAmount = allocsByBill.get(bill.id) || 0;
    const dueAmount = Math.max(0, netTotal - paidAmount);
    const status = dueAmount <= 0.01 ? "paid" : paidAmount > 0 ? "partial" : "due";

    return {
      ...bill,
      isDeleted: !!bill.deletedAt,
      items,
      itemsTotal,
      netTotal,
      paidAmount,
      totalPaid: paidAmount,
      balanceDue: dueAmount,
      dueAmount,
      status,
    };
  });
}

export async function getBillByIdAction(idOrBillNo: string) {
  try {
    await requireAuth();

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrBillNo
      );

    const [bill] = isUuid
      ? await db
          .select()
          .from(bills)
          .where(eq(bills.id, idOrBillNo))
          .limit(1)
      : await db
          .select()
          .from(bills)
          .where(eq(bills.billNo, idOrBillNo.toUpperCase()))
          .limit(1);

    if (!bill) return null;

    const items = await db
      .select()
      .from(billItems)
      .where(eq(billItems.billId, bill.id));

    const allocs = await db
      .select({
        id: paymentAllocations.id,
        amount: paymentAllocations.amount,
        paymentDate: payments.paymentDate,
        mode: payments.mode,
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(and(eq(paymentAllocations.billId, bill.id), isNull(payments.deletedAt)));

    const itemsTotal = items.reduce((acc: number, it: any) => acc + (Number(it.totalAmount) || 0), 0);
    const hamali = Number(bill.hamali || 0);
    const netPayable = Math.max(0, itemsTotal - hamali);
    const totalPaid = allocs.reduce((acc: number, a: any) => acc + (Number(a.amount) || 0), 0);
    const balanceDue = Math.max(0, netPayable - totalPaid);
    const isPaid = balanceDue <= 0.01;

    return {
      ...bill,
      isDeleted: !!bill.deletedAt,
      items,
      itemsTotal,
      netPayable,
      totalAmount: netPayable,
      totalPaid,
      balanceDue,
      isPaid,
      allocations: allocs,
    };
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Error fetching bill by id:", err);
    return null;
  }
}

export async function createBillAction(data: CreateBillInput) {
  const user = await requireAuth();

  if (!data.partyName.trim()) {
    throw new Error("Party name is required.");
  }
  if (!data.items || data.items.length === 0) {
    throw new Error("At least one product item is required.");
  }

  // 1. Get or generate next bill number
  const prefix = data.kind === "purchase" ? "P" : "S";
  const [profileSetting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "business_profile"))
    .limit(1);

  let profileVal = (profileSetting?.value as any) || {};
  let nextNum =
    data.kind === "purchase"
      ? profileVal.pSeriesNext || 1
      : profileVal.sSeriesNext || 1;

  const billNo = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  // 2. Find or create party (case-insensitive & normalize)
  const partyType = data.kind === "purchase" ? "farmer" : "client";
  const cleanPartyName = data.partyName.trim();
  const cleanPhone = (data.partyPhone || "").trim();
  const cleanVillage = (data.partyVillage || "").trim();

  let existingParty = null;
  if (cleanPhone) {
    [existingParty] = await db
      .select()
      .from(parties)
      .where(eq(parties.phone, cleanPhone))
      .limit(1);
  }
  if (!existingParty) {
    [existingParty] = await db
      .select()
      .from(parties)
      .where(sql`lower(trim(${parties.name})) = lower(trim(${cleanPartyName}))`)
      .limit(1);
  }

  let partyId = existingParty?.id;

  if (!existingParty) {
    const [newParty] = await db
      .insert(parties)
      .values({
        type: partyType,
        name: cleanPartyName,
        phone: cleanPhone,
        village: cleanVillage,
      })
      .returning();
    partyId = newParty.id;
  } else if (cleanPhone || cleanVillage) {
    await db
      .update(parties)
      .set({
        phone: cleanPhone || existingParty.phone,
        village: cleanVillage || existingParty.village,
        type:
          existingParty.type === "both"
            ? "both"
            : existingParty.type === partyType
            ? partyType
            : "both",
        updatedAt: new Date(),
      })
      .where(eq(parties.id, existingParty.id));
  }

  // 3. Process items
  const processedItems = data.items.map((it) => {
    const bagWeights = parseBagWeights(it.bagWeightsInput);
    const grossKg = calculateGrossWeight(bagWeights);
    const cutKg = Number(it.cutKg) || 0;
    const netKg = calculateNetWeight(grossKg, cutKg);
    const ratePerKg = Number(it.ratePerKg) || 0;
    const totalAmount = calculateItemTotal(netKg, ratePerKg);

    return {
      productId: it.productId,
      productName: it.productName.trim(),
      grade: it.grade || "",
      bagWeights,
      cutKg: cutKg.toString(),
      netKg: netKg.toString(),
      ratePerKg: ratePerKg.toString(),
      totalAmount: totalAmount.toString(),
    };
  });

  const hamali = Number(data.hamali) || 0;
  const paidNow = Number(data.paidNow) || 0;

  // 4. Insert bill
  const [newBill] = await db
    .insert(bills)
    .values({
      kind: data.kind,
      billNo,
      billDate: data.billDate,
      partyId,
      partyName: cleanPartyName,
      partyPhone: cleanPhone,
      partyVillage: cleanVillage,
      hamali: hamali.toString(),
      paidNow: paidNow.toString(),
      note: data.note || "",
      createdBy: user.id,
    })
    .returning();

  // 5. Insert bill items
  for (const item of processedItems) {
    await db.insert(billItems).values({
      billId: newBill.id,
      productId: item.productId,
      productName: item.productName,
      grade: item.grade,
      bagWeights: item.bagWeights,
      cutKg: item.cutKg,
      netKg: item.netKg,
      ratePerKg: item.ratePerKg,
      totalAmount: item.totalAmount,
    });
  }

  // 6. Link paidNow directly into payments & payment_allocations (Single source of truth)
  if (paidNow > 0) {
    const [newPayment] = await db
      .insert(payments)
      .values({
        partyId,
        billId: newBill.id,
        partyName: cleanPartyName,
        paymentDate: data.billDate,
        partyType,
        amount: paidNow.toString(),
        kind: "payment",
        mode: "cash",
        note: `बिल ${billNo} सोबत ${data.kind === "purchase" ? "दिलेली" : "मिळालेली"} रक्कम (Paid with Bill)`,
        createdBy: user.id,
      })
      .returning();

    const itemsSum = processedItems.reduce(
      (acc, it) => acc + Number(it.totalAmount),
      0
    );
    const netTotal = Math.max(0, itemsSum - hamali);
    const allocAmount = Math.min(paidNow, netTotal);

    await db.insert(paymentAllocations).values({
      paymentId: newPayment.id,
      billId: newBill.id,
      amount: allocAmount.toString(),
    });
  }

  // 7. Increment sequence in settings
  if (data.kind === "purchase") {
    profileVal.pSeriesNext = nextNum + 1;
  } else {
    profileVal.sSeriesNext = nextNum + 1;
  }

  await db
    .insert(settings)
    .values({
      key: "business_profile",
      value: profileVal,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: profileVal, updatedAt: new Date() },
    });

  await logAudit(user, "CREATE", "bills", newBill.id, {
    billNo,
    kind: data.kind,
    partyName: cleanPartyName,
    hamali,
    paidNow,
  });

  revalidatePath("/app");
  revalidatePath("/app/purchase");
  revalidatePath("/app/sales");
  revalidatePath("/app/payments");
  revalidatePath("/app/stock");

  return { success: true, billId: newBill.id, billNo };
}

export async function deleteBillAction(id: string, reason?: string) {
  const user = await requireAdmin(); // Staff cannot delete bills

  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, id))
    .limit(1);

  if (!bill) throw new Error("Bill not found.");

  // Soft delete bill
  await db
    .update(bills)
    .set({
      deletedAt: new Date(),
      deletedBy: user.id,
      deleteReason: reason || "Admin soft-deleted bill",
    })
    .where(eq(bills.id, id));

  // Soft delete linked payments if any
  await db
    .update(payments)
    .set({
      deletedAt: new Date(),
      deletedBy: user.id,
      deleteReason: `बिल ${bill.billNo} रद्द झाल्यामुळे पेमेंट रद्द`,
    })
    .where(eq(payments.billId, id));

  await logAudit(user, "SOFT_DELETE", "bills", id, {
    billNo: bill.billNo,
    reason: reason || "",
  });

  revalidatePath("/app");
  revalidatePath("/app/purchase");
  revalidatePath("/app/sales");
  revalidatePath("/app/payments");
  revalidatePath("/app/stock");

  return { success: true, billNo: bill.billNo };
}

export async function restoreBillAction(id: string) {
  const user = await requireAdmin();

  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, id))
    .limit(1);

  if (!bill) throw new Error("Bill not found.");

  // Restore bill
  await db
    .update(bills)
    .set({
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
    })
    .where(eq(bills.id, id));

  // Restore linked payments if any
  await db
    .update(payments)
    .set({
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
    })
    .where(eq(payments.billId, id));

  await logAudit(user, "RESTORE", "bills", id, { billNo: bill.billNo });

  revalidatePath("/app");
  revalidatePath("/app/purchase");
  revalidatePath("/app/sales");
  revalidatePath("/app/payments");
  revalidatePath("/app/stock");

  return { success: true, billNo: bill.billNo };
}

export async function getPartiesAction(type?: "farmer" | "client") {
  await requireAuth();

  const partiesList = await db
    .select()
    .from(parties)
    .orderBy(parties.name);

  if (!type) return partiesList;

  return partiesList.filter(
    (p: typeof parties.$inferSelect) => p.type === type || p.type === "both"
  );
}

export async function getPartyBalancesAction() {
  await waitForMigrations();
  await requireAuth();

  const allParties = await db.select().from(parties).orderBy(parties.name);
  const activeBills = await db
    .select()
    .from(bills)
    .where(isNull(bills.deletedAt));

  const allBillItems = await db.select().from(billItems);
  const activePayments = await db
    .select({
      id: payments.id,
      partyId: payments.partyId,
      partyName: payments.partyName,
      amount: payments.amount,
      kind: payments.kind,
      deletedAt: payments.deletedAt,
    })
    .from(payments)
    .where(isNull(payments.deletedAt));

  // Group items by billId
  const itemsByBill = new Map<string, number>();
  for (const item of allBillItems) {
    const cur = itemsByBill.get(item.billId) || 0;
    itemsByBill.set(item.billId, cur + Number(item.totalAmount));
  }

  return allParties.map((party: typeof parties.$inferSelect) => {
    const partyBills = activeBills.filter(
      (b: typeof bills.$inferSelect) =>
        b.partyId === party.id ||
        b.partyName.trim().toLowerCase() === party.name.trim().toLowerCase()
    );

    let totalBilled = 0;
    for (const b of partyBills) {
      const itemsSum = itemsByBill.get(b.id) || 0;
      const netTotal = itemsSum - Number(b.hamali || 0);
      totalBilled += netTotal;
    }

    const partyPayments = activePayments.filter(
      (p) =>
        p.partyId === party.id ||
        p.partyName.trim().toLowerCase() === party.name.trim().toLowerCase()
    );

    let totalPaid = 0;
    let advances = 0;

    for (const p of partyPayments) {
      if (p.kind === "advance") {
        advances += Number(p.amount);
      } else {
        totalPaid += Number(p.amount);
      }
    }

    // Balance calculation:
    // Farmer: We owe farmer = Billed - (Payments + Advances)
    // Positive balance = To Pay Farmer (बाकी); Negative balance = Farmer has advance (ॲडव्हान्स)
    // Client: Client owes us = Billed - (Payments + Advances)
    // Positive balance = To Receive (येणे बाकी); Negative balance = Client advance (ॲडव्हान्स)
    const netPaidTotal = totalPaid + advances;
    const balance = Math.round((totalBilled - netPaidTotal) * 100) / 100;

    return {
      partyId: party.id,
      partyName: party.name,
      partyPhone: party.phone || "",
      partyVillage: party.village || "",
      partyType: party.type,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      advances: Math.round(advances * 100) / 100,
      balance, // > 0 = dues, < 0 = advance
    };
  });
}

export async function getPartyLedgerAction(partyId: string) {
  await requireAuth();

  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, partyId))
    .limit(1);

  if (!party) throw new Error("Party not found.");

  const partyBills = await db
    .select()
    .from(bills)
    .where(and(eq(bills.partyId, partyId), isNull(bills.deletedAt)))
    .orderBy(bills.billDate);

  const billIds = partyBills.map((b: any) => b.id);
  const items =
    billIds.length > 0
      ? await db
          .select()
          .from(billItems)
          .where(sql`${billItems.billId} in ${billIds}`)
      : [];

  const itemsMap = new Map<string, number>();
  for (const it of items) {
    itemsMap.set(it.billId, (itemsMap.get(it.billId) || 0) + Number(it.totalAmount));
  }

  const billsWithTotals = partyBills.map((b: any) => ({
    id: b.id,
    kind: b.kind,
    billNo: b.billNo,
    billDate: b.billDate,
    hamali: b.hamali,
    paidNow: b.paidNow,
    netTotal: Math.max(0, (itemsMap.get(b.id) || 0) - Number(b.hamali || 0)),
    createdAt: b.createdAt,
  }));

  const partyPayments = await db
    .select()
    .from(payments)
    .where(and(eq(payments.partyId, partyId), isNull(payments.deletedAt)))
    .orderBy(payments.paymentDate);

  return buildPartyLedger(party, billsWithTotals, partyPayments as any);
}

export async function mergePartiesAction(sourcePartyId: string, targetPartyId: string) {
  const user = await requireAdmin();

  if (sourcePartyId === targetPartyId) {
    throw new Error("Cannot merge a party into itself.");
  }

  const [sourceParty] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, sourcePartyId))
    .limit(1);

  const [targetParty] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, targetPartyId))
    .limit(1);

  if (!sourceParty || !targetParty) {
    throw new Error("Source or target party not found.");
  }

  // Update all bills
  await db
    .update(bills)
    .set({
      partyId: targetParty.id,
      partyName: targetParty.name,
      partyPhone: targetParty.phone || sourceParty.phone,
      partyVillage: targetParty.village || sourceParty.village,
    })
    .where(eq(bills.partyId, sourceParty.id));

  // Update all payments
  await db
    .update(payments)
    .set({
      partyId: targetParty.id,
      partyName: targetParty.name,
    })
    .where(eq(payments.partyId, sourceParty.id));

  // Update all calls
  await db
    .update(calls)
    .set({
      partyId: targetParty.id,
      callerName: targetParty.name,
    })
    .where(eq(calls.partyId, sourceParty.id));

  // Delete source party
  await db.delete(parties).where(eq(parties.id, sourceParty.id));

  await logAudit(user, "MERGE_PARTIES", "parties", targetParty.id, {
    sourcePartyName: sourceParty.name,
    targetPartyName: targetParty.name,
  });

  revalidatePath("/app");
  revalidatePath("/app/purchase");
  revalidatePath("/app/sales");
  revalidatePath("/app/payments");
  revalidatePath("/app/settings");

  return { success: true };
}
