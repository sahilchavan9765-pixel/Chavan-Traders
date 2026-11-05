"use server";

import { db } from "@/db";
import { bills, billItems, stockAdjustments } from "@/db/schema";
import { requireAuth, requireAdmin, logAudit } from "@/lib/auth-guard";
import { calculateUnifiedStock } from "@/lib/stock";
import { eq, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getStockReportAction() {
  await requireAuth();

  const allBills = await db
    .select({
      id: bills.id,
      kind: bills.kind,
      billNo: bills.billNo,
      billDate: bills.billDate,
      partyName: bills.partyName,
      deletedAt: bills.deletedAt,
    })
    .from(bills)
    .where(isNull(bills.deletedAt));

  const allItems = await db
    .select({
      billId: billItems.billId,
      productName: billItems.productName,
      grade: billItems.grade,
      netKg: billItems.netKg,
      ratePerKg: billItems.ratePerKg,
      totalAmount: billItems.totalAmount,
    })
    .from(billItems);

  let adjustments: any[] = [];
  try {
    adjustments = await db
      .select({
        id: stockAdjustments.id,
        product: stockAdjustments.product,
        date: stockAdjustments.date,
        kgChange: stockAdjustments.kgChange,
        reason: stockAdjustments.reason,
        note: stockAdjustments.note,
        deletedAt: stockAdjustments.deletedAt,
      })
      .from(stockAdjustments)
      .where(isNull(stockAdjustments.deletedAt));
  } catch (err) {
    console.warn("Could not query stockAdjustments table, proceeding with empty:", err);
  }

  const { stockReport, totalValuation, totalInStockKg, movements } = calculateUnifiedStock(
    allBills as any[],
    allItems as any[],
    adjustments as any[]
  );

  return { stockReport, totalValuation, totalInStockKg, movements };
}

export interface CreateStockAdjustmentInput {
  product: string;
  date: string;
  kgChange: number;
  reason: "wastage" | "moisture_loss" | "correction" | "opening_stock";
  note?: string;
}

export async function createStockAdjustmentAction(data: CreateStockAdjustmentInput) {
  const user = await requireAdmin();

  if (!data.product || !data.product.trim()) {
    throw new Error("Product name is required.");
  }
  if (!data.date) {
    throw new Error("Date is required.");
  }
  if (data.kgChange === 0 || isNaN(Number(data.kgChange))) {
    throw new Error("KG change must be a non-zero number.");
  }

  const [adjustment] = await db
    .insert(stockAdjustments)
    .values({
      product: data.product.trim(),
      date: data.date,
      kgChange: String(data.kgChange),
      reason: data.reason,
      note: data.note || "",
      createdBy: user.id,
    })
    .returning();

  await logAudit(user, "CREATE_STOCK_ADJUSTMENT", "stock_adjustment", adjustment.id, {
    product: data.product,
    kgChange: data.kgChange,
    reason: data.reason,
  });

  revalidatePath("/app/stock");
  return adjustment;
}

export async function getProfitReportAction() {
  const user = await requireAuth();

  // If staff, profit is hidden as per specs
  if (user.role !== "admin") {
    return { profit: null, isStaff: true };
  }

  const { stockReport } = await getStockReportAction();

  // Profit estimation based on sales vs weighted average buy cost
  return { profit: null, isStaff: false, stockReport };
}
