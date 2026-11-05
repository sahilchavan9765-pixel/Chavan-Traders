"use server";

import { db, waitForMigrations } from "@/db";
import { payments, parties, bills, paymentAllocations, billItems, users, counters } from "@/db/schema";
import { requireAuth, requireAdmin, logAudit } from "@/lib/auth-guard";
import { eq, desc, isNull, and, sql, asc, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CreatePaymentInput {
  partyId?: string;
  billId?: string;
  partyName: string;
  partyType: "farmer" | "client";
  paymentDate: string; // YYYY-MM-DD
  amount: number;
  kind: "payment" | "advance";
  direction?: "IN" | "OUT";
  mode: "cash" | "upi" | "bank" | "cheque";
  referenceNo?: string;
  handledBy?: string;
  paidByName?: string;
  timingTag?: "with_bill" | "later" | "advance";
  note?: string;
}

/** Race-safe next voucher number using a counters table */
async function getNextVoucherNo(direction: "IN" | "OUT"): Promise<string> {
  const key = direction === "OUT" ? "PV" : "RC";
  try {
    // Try counters table first (created by migration)
    const existing = await db.select().from(counters).where(eq(counters.key, key)).limit(1);
    if (existing.length > 0) {
      const nextVal = existing[0].nextVal;
      await db.update(counters).set({ nextVal: nextVal + 1 }).where(eq(counters.key, key));
      return `${key}-${String(nextVal).padStart(4, "0")}`;
    } else {
      // First time: count existing, insert counter
      // Count existing vouchers for this series to find next
      const existingPayments = await db
        .select({ vno: payments.voucherNo })
        .from(payments);
      let maxNum = 0;
      for (const r of existingPayments) {
        if ((r.vno || "").startsWith(key + "-")) {
          const n = parseInt((r.vno || "").replace(key + "-", ""), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
      const nextVal = maxNum + 2; // +1 for this payment, +1 for next
      await db.insert(counters).values({ key, nextVal });
      return `${key}-${String(maxNum + 1).padStart(4, "0")}`;
    }
  } catch (e: any) {
    // Fallback: timestamp-based unique number if counters table missing
    console.warn("[payments] Voucher counter fallback:", e?.message?.slice(0, 60));
    const ts = Date.now().toString().slice(-4);
    return `${key}-T${ts}`;
  }
}

/** Safe wrapper: returns payments with graceful fallback if new columns missing */
async function safeGetPayments(conditions: any[]): Promise<any[]> {
  try {
    // Full query with all v2 columns
    return await db
      .select({
        id: payments.id,
        partyId: payments.partyId,
        billId: payments.billId,
        partyName: payments.partyName,
        paymentDate: payments.paymentDate,
        partyType: payments.partyType,
        amount: payments.amount,
        kind: payments.kind,
        direction: payments.direction,
        mode: payments.mode,
        referenceNo: payments.referenceNo,
        voucherNo: payments.voucherNo,
        handledBy: payments.handledBy,
        paidByName: payments.paidByName,
        timingTag: payments.timingTag,
        note: payments.note,
        createdBy: payments.createdBy,
        recordedBy: payments.recordedBy,
        deletedAt: payments.deletedAt,
        deletedBy: payments.deletedBy,
        deleteReason: payments.deleteReason,
        createdAt: payments.createdAt,
        directBillNo: bills.billNo,
        directBillKind: bills.kind,
      })
      .from(payments)
      .leftJoin(bills, eq(payments.billId, bills.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.paymentDate), desc(payments.createdAt));
  } catch (err: any) {
    console.error("[payments] Full column query failed, falling back to minimal:", err?.message?.slice(0, 100));
    // Fallback: minimal columns that always exist
    const minimal = await db
      .select({
        id: payments.id,
        partyName: payments.partyName,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        kind: payments.kind,
        mode: payments.mode,
        note: payments.note,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.paymentDate));
    
    // Enrich with defaults for missing columns
    return minimal.map((p: any) => ({
      ...p,
      partyId: null,
      billId: null,
      partyType: "farmer",
      direction: "OUT",
      referenceNo: "",
      voucherNo: "",
      handledBy: "",
      paidByName: "",
      timingTag: "with_bill",
      createdBy: null,
      recordedBy: null,
      deletedAt: null,
      deletedBy: null,
      deleteReason: "",
      directBillNo: null,
      directBillKind: null,
    }));
  }
}

export async function getPaymentsAction(partyId?: string, includeDeleted = false) {
  await waitForMigrations();
  const user = await requireAuth();

  const conditions: any[] = [];
  if (!includeDeleted || user.role !== "admin") {
    conditions.push(isNull(payments.deletedAt));
  }
  if (partyId) {
    conditions.push(eq(payments.partyId, partyId));
  }

  const paymentRows = await safeGetPayments(conditions);

  // Fetch all allocations for these payments
  const paymentIds = paymentRows.map((p: any) => p.id);
  
  let allAllocations: any[] = [];
  if (paymentIds.length > 0) {
    try {
      allAllocations = await db
        .select({
          id: paymentAllocations.id,
          paymentId: paymentAllocations.paymentId,
          billId: paymentAllocations.billId,
          amount: paymentAllocations.amount,
          billNo: bills.billNo,
          billKind: bills.kind,
        })
        .from(paymentAllocations)
        .innerJoin(bills, eq(paymentAllocations.billId, bills.id));
    } catch (e: any) {
      console.warn("[payments] Allocations query failed:", e?.message?.slice(0, 60));
    }
  }

  const allocsByPayment = new Map<string, any[]>();
  for (const alloc of allAllocations) {
    const list = allocsByPayment.get(alloc.paymentId) || [];
    list.push(alloc);
    allocsByPayment.set(alloc.paymentId, list);
  }

  return paymentRows.map((p: any) => {
    const allocs = allocsByPayment.get(p.id) || [];
    return {
      ...p,
      isDeleted: !!p.deletedAt,
      allocations: allocs,
    };
  });
}

export async function createPaymentAction(data: CreatePaymentInput) {
  await waitForMigrations();
  const user = await requireAuth();

  const cleanPartyName = data.partyName.trim();
  if (!cleanPartyName) throw new Error("काहीतरी चुकले: पार्टीचे नाव आवश्यक आहे.");
  const paymentAmount = Number(data.amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) throw new Error("काहीतरी चुकले: वैध रक्कम आवश्यक आहे.");

  // Auto-detect direction from party type if not provided
  const direction: "IN" | "OUT" = data.direction ?? (data.partyType === "farmer" ? "OUT" : "IN");

  // 1. Ensure party exists
  let partyId = data.partyId;
  if (!partyId) {
    const [existingParty] = await db
      .select()
      .from(parties)
      .where(sql`lower(trim(${parties.name})) = lower(trim(${cleanPartyName}))`)
      .limit(1);

    if (existingParty) {
      partyId = existingParty.id;
    } else {
      const [newParty] = await db
        .insert(parties)
        .values({ type: data.partyType, name: cleanPartyName })
        .returning();
      partyId = newParty.id;
    }
  }

  // 2. Generate race-safe voucher number
  const voucherNo = await getNextVoucherNo(direction);

  // 3. Determine timing tag
  const timingTag: "with_bill" | "later" | "advance" =
    data.timingTag ?? (data.billId ? "with_bill" : data.kind === "advance" ? "advance" : "later");

  // 4. Insert payment
  const [payment] = await db
    .insert(payments)
    .values({
      partyId,
      billId: data.billId || null,
      partyName: cleanPartyName,
      partyType: data.partyType,
      paymentDate: data.paymentDate,
      amount: paymentAmount.toString(),
      kind: data.kind,
      direction,
      mode: data.mode,
      referenceNo: data.referenceNo || "",
      voucherNo,
      handledBy: data.handledBy || "",
      paidByName: data.paidByName || "",
      timingTag,
      note: data.note || "",
      createdBy: user.id,
      recordedBy: user.id,
    })
    .returning();

  // 5. FIFO Payment Allocation
  if (data.kind === "payment") {
    let remainingToAllocate = paymentAmount;

    const activeBills = await db
      .select()
      .from(bills)
      .where(
        and(
          isNull(bills.deletedAt),
          sql`lower(trim(${bills.partyName})) = lower(trim(${cleanPartyName}))`
        )
      )
      .orderBy(asc(bills.billDate), asc(bills.createdAt));

    const allItems = await db.select().from(billItems);
    const itemsByBill = new Map<string, number>();
    for (const it of allItems) {
      itemsByBill.set(it.billId, (itemsByBill.get(it.billId) || 0) + Number(it.totalAmount));
    }

    const existingAllocs = await db.select().from(paymentAllocations);
    const allocSumByBill = new Map<string, number>();
    for (const a of existingAllocs) {
      allocSumByBill.set(a.billId, (allocSumByBill.get(a.billId) || 0) + Number(a.amount));
    }

    // Priority 1: User-specified bill
    if (data.billId) {
      const targetBill = activeBills.find((b: any) => b.id === data.billId);
      if (targetBill) {
        const netTotal = Math.max(0, (itemsByBill.get(targetBill.id) || 0));
        const alreadyAlloc = allocSumByBill.get(targetBill.id) || 0;
        const openDue = Math.max(0, netTotal - alreadyAlloc);
        if (openDue > 0) {
          const allocNow = Math.min(remainingToAllocate, openDue);
          await db.insert(paymentAllocations).values({
            paymentId: payment.id,
            billId: targetBill.id,
            amount: allocNow.toString(),
          });
          remainingToAllocate -= allocNow;
          allocSumByBill.set(targetBill.id, alreadyAlloc + allocNow);
        }
      }
    }

    // Priority 2: Auto-allocate remaining FIFO
    if (remainingToAllocate > 0.01) {
      for (const bill of activeBills) {
        if (remainingToAllocate <= 0.01) break;
        const netTotal = itemsByBill.get(bill.id) || 0;
        const alreadyAlloc = allocSumByBill.get(bill.id) || 0;
        const openDue = Math.max(0, netTotal - alreadyAlloc);
        if (openDue > 0) {
          const allocNow = Math.min(remainingToAllocate, openDue);
          await db.insert(paymentAllocations).values({
            paymentId: payment.id,
            billId: bill.id,
            amount: allocNow.toString(),
          });
          remainingToAllocate -= allocNow;
          allocSumByBill.set(bill.id, alreadyAlloc + allocNow);
        }
      }
    }
  }

  await logAudit(user, "CREATE", "payments", payment.id, {
    partyName: cleanPartyName,
    amount: paymentAmount,
    kind: data.kind,
    direction,
    voucherNo,
    mode: data.mode,
  });

  revalidatePath("/app");
  revalidatePath("/app/payments");
  revalidatePath("/app/purchase");
  revalidatePath("/app/sales");

  return { success: true, paymentId: payment.id, voucherNo };
}

export async function deletePaymentAction(id: string, reason?: string) {
  await waitForMigrations();
  const user = await requireAdmin();

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);

  if (!payment) throw new Error("Payment record not found.");

  await db
    .update(payments)
    .set({
      deletedAt: new Date(),
      deletedBy: user.id,
      deleteReason: reason || "Admin soft-deleted payment",
    })
    .where(eq(payments.id, id));

  await logAudit(user, "SOFT_DELETE", "payments", id, {
    partyName: payment.partyName,
    amount: payment.amount,
    voucherNo: (payment as any).voucherNo || "",
    reason: reason || "",
  });

  revalidatePath("/app");
  revalidatePath("/app/payments");
  revalidatePath("/app/purchase");
  revalidatePath("/app/sales");

  return { success: true };
}

export async function restorePaymentAction(id: string) {
  await waitForMigrations();
  const user = await requireAdmin();

  const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!payment) throw new Error("Payment record not found.");

  await db
    .update(payments)
    .set({ deletedAt: null, deletedBy: null, deleteReason: null })
    .where(eq(payments.id, id));

  await logAudit(user, "RESTORE", "payments", id, {
    partyName: payment.partyName,
    amount: payment.amount,
  });

  revalidatePath("/app");
  revalidatePath("/app/payments");

  return { success: true };
}

/** Party ledger: all bills + payments chronologically with running balance */
export async function getPartyLedgerAction(partyName: string) {
  await waitForMigrations();
  await requireAuth();

  const cleanName = partyName.trim();

  const partyBills = await db
    .select()
    .from(bills)
    .where(
      and(
        isNull(bills.deletedAt),
        sql`lower(trim(${bills.partyName})) = lower(trim(${cleanName}))`
      )
    )
    .orderBy(asc(bills.billDate), asc(bills.createdAt));

  const partyPaymentsRaw = await safeGetPayments([
    isNull(payments.deletedAt),
    sql`lower(trim(${payments.partyName})) = lower(trim(${cleanName}))`,
  ]);

  const allItems = await db.select().from(billItems);
  const itemsByBill = new Map<string, number>();
  for (const it of allItems) {
    itemsByBill.set(it.billId, (itemsByBill.get(it.billId) || 0) + Number(it.totalAmount));
  }

  const allAllocs = await db.select().from(paymentAllocations);
  const allocSumByBill = new Map<string, number>();
  for (const a of allAllocs) {
    allocSumByBill.set(a.billId, (allocSumByBill.get(a.billId) || 0) + Number(a.amount));
  }

  type LedgerEntry = {
    date: string;
    type: "bill" | "payment";
    description: string;
    debit: number;
    credit: number;
    ref: string;
    balance?: number;
  };

  const entries: LedgerEntry[] = [];

  for (const b of partyBills) {
    const netTotal = itemsByBill.get(b.id) || 0;
    const paid = allocSumByBill.get(b.id) || 0;
    entries.push({
      date: b.billDate,
      type: "bill",
      description: b.kind === "purchase" ? "खरेदी बिल" : "विक्री बिल",
      debit: b.kind === "purchase" ? netTotal : 0,
      credit: b.kind === "sale" ? netTotal : 0,
      ref: b.billNo,
    });
  }

  for (const p of partyPaymentsRaw) {
    const amt = Number(p.amount);
    const dir = p.direction || "OUT";
    entries.push({
      date: p.paymentDate,
      type: "payment",
      description: dir === "OUT"
        ? `दिले – ${p.mode?.toUpperCase() || "CASH"}`
        : `मिळाले – ${p.mode?.toUpperCase() || "CASH"}`,
      debit: dir === "IN" ? amt : 0,
      credit: dir === "OUT" ? amt : 0,
      ref: p.voucherNo || p.id.substring(0, 8),
    });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  for (const e of entries) {
    balance += e.debit - e.credit;
    e.balance = balance;
  }

  return { entries, finalBalance: balance, partyName: cleanName };
}
