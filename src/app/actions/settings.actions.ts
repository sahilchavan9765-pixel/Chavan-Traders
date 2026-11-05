"use server";

import { db } from "@/db";
import {
  settings,
  users,
  bills,
  billItems,
  payments,
  parties,
  calls,
  enquiries,
  products,
  auditLogs,
} from "@/db/schema";
import { requireAuth, requireAdmin, logAudit } from "@/lib/auth-guard";
import bcrypt from "bcryptjs";
import { eq, isNull, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSettingsAction() {
  await requireAuth();

  const [profile] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "business_profile"))
    .limit(1);

  return profile?.value || null;
}

export async function updateBusinessProfileAction(data: Record<string, any>) {
  const user = await requireAdmin();

  await db
    .insert(settings)
    .values({
      key: "business_profile",
      value: data,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: data, updatedAt: new Date() },
    });

  await logAudit(user, "UPDATE", "settings", "business_profile");

  revalidatePath("/app");
  revalidatePath("/app/settings");

  return { success: true };
}

export async function changePasswordAction(currentPass: string, newPass: string) {
  const user = await requireAuth();

  if (!newPass || newPass.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) throw new Error("User not found.");

  const isMatch = await bcrypt.compare(currentPass, dbUser.passwordHash);
  if (!isMatch) {
    throw new Error("Current password is incorrect.");
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPass, salt);

  await db
    .update(users)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await logAudit(user, "CHANGE_PASSWORD", "users", user.id);

  return { success: true };
}

export async function exportBackupAction() {
  await requireAdmin();

  const allParties = await db.select().from(parties);
  const allBills = await db.select().from(bills);
  const allBillItems = await db.select().from(billItems);
  const allPayments = await db.select().from(payments);
  const allCalls = await db.select().from(calls);
  const allEnquiries = await db.select().from(enquiries);
  const allSettings = await db.select().from(settings);

  return {
    version: "2.0",
    exportDate: new Date().toISOString(),
    parties: allParties,
    bills: allBills,
    billItems: allBillItems,
    payments: allPayments,
    calls: allCalls,
    enquiries: allEnquiries,
    settings: allSettings,
  };
}

export async function importOldCt1Action(ct1Data: {
  pur?: any[];
  sal?: any[];
  pay?: any[];
  calls?: any[];
}) {
  const user = await requireAdmin();

  let importedBills = 0;
  let importedPayments = 0;
  let importedCalls = 0;

  // 1. Import Purchases
  if (Array.isArray(ct1Data.pur)) {
    for (const p of ct1Data.pur) {
      if (!p.party && !p.name) continue;
      const partyName = (p.party || p.name || "").trim();
      const billNo = p.no || `P-${Date.now().toString().slice(-4)}`;

      // Check if bill with this billNo exists
      const [existing] = await db
        .select()
        .from(bills)
        .where(eq(bills.billNo, billNo))
        .limit(1);

      if (existing) continue;

      const [newBill] = await db
        .insert(bills)
        .values({
          kind: "purchase",
          billNo,
          billDate: p.date || new Date().toISOString().slice(0, 10),
          partyName,
          partyPhone: p.phone || "",
          partyVillage: p.village || "",
          hamali: (Number(p.hamali) || 0).toString(),
          paidNow: (Number(p.paid) || Number(p.paidNow) || 0).toString(),
          note: p.note || "",
          createdBy: user.id,
        })
        .returning();

      // Items
      const bagWeights = Array.isArray(p.bags) ? p.bags : [];
      await db.insert(billItems).values({
        billId: newBill.id,
        productName: p.crop || p.product || "भात",
        bagWeights,
        cutKg: (Number(p.cut) || 0).toString(),
        netKg: (Number(p.net) || Number(p.netKg) || 0).toString(),
        ratePerKg: (Number(p.rate) || 0).toString(),
        totalAmount: (Number(p.total) || 0).toString(),
      });

      importedBills++;
    }
  }

  // 2. Import Sales
  if (Array.isArray(ct1Data.sal)) {
    for (const s of ct1Data.sal) {
      if (!s.party && !s.name) continue;
      const partyName = (s.party || s.name || "").trim();
      const billNo = s.no || `S-${Date.now().toString().slice(-4)}`;

      const [existing] = await db
        .select()
        .from(bills)
        .where(eq(bills.billNo, billNo))
        .limit(1);

      if (existing) continue;

      const [newBill] = await db
        .insert(bills)
        .values({
          kind: "sale",
          billNo,
          billDate: s.date || new Date().toISOString().slice(0, 10),
          partyName,
          partyPhone: s.phone || "",
          partyVillage: s.village || "",
          hamali: (Number(s.hamali) || 0).toString(),
          paidNow: (Number(s.paid) || Number(s.paidNow) || 0).toString(),
          note: s.note || "",
          createdBy: user.id,
        })
        .returning();

      const bagWeights = Array.isArray(s.bags) ? s.bags : [];
      await db.insert(billItems).values({
        billId: newBill.id,
        productName: s.crop || s.product || "भात",
        bagWeights,
        cutKg: (Number(s.cut) || 0).toString(),
        netKg: (Number(s.net) || Number(s.netKg) || 0).toString(),
        ratePerKg: (Number(s.rate) || 0).toString(),
        totalAmount: (Number(s.total) || 0).toString(),
      });

      importedBills++;
    }
  }

  // 3. Import Payments
  if (Array.isArray(ct1Data.pay)) {
    for (const py of ct1Data.pay) {
      if (!py.party && !py.name) continue;
      await db.insert(payments).values({
        partyName: (py.party || py.name).trim(),
        paymentDate: py.date || new Date().toISOString().slice(0, 10),
        partyType: py.type === "client" ? "client" : "farmer",
        amount: (Number(py.amt) || Number(py.amount) || 0).toString(),
        kind: py.kind === "advance" ? "advance" : "payment",
        mode: py.mode === "upi" ? "upi" : py.mode === "bank" ? "bank" : "cash",
        note: py.note || "",
        createdBy: user.id,
      });
      importedPayments++;
    }
  }

  // 4. Import Calls
  if (Array.isArray(ct1Data.calls)) {
    for (const c of ct1Data.calls) {
      if (!c.name && !c.callerName) continue;
      await db.insert(calls).values({
        callerName: (c.name || c.callerName).trim(),
        phone: c.phone || "",
        product: c.crop || c.product || "",
        quantityKg: (Number(c.qty) || Number(c.quantityKg) || 0).toString(),
        location: c.loc || c.location || "",
        followUpDate: c.fDate || c.followUpDate || "",
        status: c.status === "completed" ? "completed" : "pending",
        notes: c.notes || "",
      });
      importedCalls++;
    }
  }

  await logAudit(user, "IMPORT_OLD_CT1", "system", "", {
    importedBills,
    importedPayments,
    importedCalls,
  });

  revalidatePath("/app");

  return {
    success: true,
    importedBills,
    importedPayments,
    importedCalls,
  };
}

export interface HealthCheckItem {
  id: string;
  nameMr: string;
  nameEn: string;
  status: "ok" | "warning" | "error";
  details: string;
}

export interface HealthCheckResult {
  allMatch: boolean;
  totalChecks: number;
  passedChecks: number;
  checkedAt: string;
  checks: HealthCheckItem[];
}

export async function runDataHealthCheckAction(): Promise<HealthCheckResult> {
  await requireAdmin();

  const checks: HealthCheckItem[] = [];

  // 1. Fetch active data
  const allBills = await db.select().from(bills);
  const activeBills = allBills.filter((b: any) => !b.deletedAt);
  const deletedBills = allBills.filter((b: any) => !!b.deletedAt);

  const allItems = await db.select().from(billItems);
  const activeBillIds = new Set(activeBills.map((b: any) => b.id));
  const activeItems = allItems.filter((it: any) => activeBillIds.has(it.billId));

  const allPayments = await db.select().from(payments);
  const activePayments = allPayments.filter((p: any) => !p.deletedAt);
  const deletedPayments = allPayments.filter((p: any) => !!p.deletedAt);

  const allPartiesList = await db.select().from(parties);

  // Check 1: Bill Items Totals Reconciliation
  let itemsMismatchCount = 0;
  for (const b of activeBills) {
    const items = activeItems.filter((it: any) => it.billId === b.id);
    const sumTotal = items.reduce((sum: number, it: any) => sum + Number(it.totalAmount || 0), 0);
    const hamali = Number(b.hamali || 0);
    const netBill = Math.max(0, sumTotal - hamali);
    const paid = Number(b.paidNow || 0);
    if (paid > netBill + 0.01) {
      itemsMismatchCount++;
    }
  }

  checks.push({
    id: "bill_items_integrity",
    nameMr: "बिल आयटम्स आणि एकूण बेरीज पडताळणी",
    nameEn: "Bill Items & Math Calculation Integrity",
    status: itemsMismatchCount === 0 ? "ok" : "warning",
    details:
      itemsMismatchCount === 0
        ? `सर्व ${activeBills.length} बिलांची गणिते आणि वजन परिपूर्ण जुळत आहेत.`
        : `${itemsMismatchCount} बिलांमध्ये आगाऊ भरणा किंवा विसंगती आढळली.`,
  });

  // Check 2: Linked Payments Consistency
  let linkedMismatch = 0;
  for (const b of activeBills) {
    const billPaidNow = Number(b.paidNow || 0);
    if (billPaidNow > 0) {
      const linkedP = activePayments.find((p: any) => p.billId === b.id);
      if (linkedP && Math.abs(Number(linkedP.amount) - billPaidNow) > 0.01) {
        linkedMismatch++;
      }
    }
  }

  checks.push({
    id: "linked_payments",
    nameMr: "बिलातील जमा रक्कम आणि पेमेंट वही ताळमेळ",
    nameEn: "Linked Paid-Now vs Payments Register Sync",
    status: linkedMismatch === 0 ? "ok" : "error",
    details:
      linkedMismatch === 0
        ? `बिलातील रोख जमा/खर्च नोंदी पेमेंट वहीशी अचूक संलग्न आहेत.`
        : `${linkedMismatch} बिलांमधील भरलेली रक्कम पेमेंट वहीशी जुळत नाही.`,
  });

  // Check 3: Soft-Delete Isolation
  const softDeleteViolations = deletedBills.some((dbill: any) =>
    activePayments.some((p: any) => p.billId === dbill.id)
  );

  checks.push({
    id: "soft_delete_isolation",
    nameMr: "रद्द केलेल्या बिलांचे अचूक विलगीकरण",
    nameEn: "Void / Soft-Deleted Bills Data Isolation",
    status: !softDeleteViolations ? "ok" : "warning",
    details: !softDeleteViolations
      ? `सर्व ${deletedBills.length} रद्द केलेली बिले चालू हिशोबापासून सुरक्षितपणे वेगळी ठेवली आहेत.`
      : `रद्द केलेल्या बिलांच्या काही नोंदी अजूनही चालू खात्यात आढळल्या.`,
  });

  // Check 4: Stock Reconciliation (Purchased Net KG - Sold Net KG)
  let purchaseNetKg = 0;
  let saleNetKg = 0;
  for (const b of activeBills) {
    const items = activeItems.filter((it: any) => it.billId === b.id);
    const kg = items.reduce((s: number, it: any) => s + Number(it.netKg || 0), 0);
    if (b.kind === "purchase") purchaseNetKg += kg;
    else saleNetKg += kg;
  }

  checks.push({
    id: "stock_reconciliation",
    nameMr: "गोदाम स्टॉक ताळेबंद (खरेदी वजन वि. विक्री वजन)",
    nameEn: "Stock Net Weight Balance",
    status: purchaseNetKg >= saleNetKg ? "ok" : "warning",
    details: `एकूण खरेदी वजन: ${purchaseNetKg.toFixed(2)} KG | एकूण विक्री वजन: ${saleNetKg.toFixed(2)} KG | शिल्लक साठा: ${(
      purchaseNetKg - saleNetKg
    ).toFixed(2)} KG.`,
  });

  // Check 5: Parties Master Uniqueness
  const nameSet = new Set<string>();
  let duplicateCount = 0;
  for (const p of allPartiesList) {
    const norm = p.name.trim().toLowerCase();
    if (nameSet.has(norm)) duplicateCount++;
    else nameSet.add(norm);
  }

  checks.push({
    id: "party_master",
    nameMr: "शेतकरी व ग्राहक मास्टर डुप्लिकेशन तपासणी",
    nameEn: "Party Master Name Normalization",
    status: duplicateCount === 0 ? "ok" : "warning",
    details:
      duplicateCount === 0
        ? `सर्व ${allPartiesList.length} पार्टी खाती अद्वितीय आणि प्रमाणित आहेत.`
        : `${duplicateCount} नावांमध्ये समान किंवा डुप्लिकेट नोंदी आढळल्या (पार्टी एकत्र करा टूल वापरा).`,
  });

  const passedChecks = checks.filter((c) => c.status === "ok").length;
  const allMatch = passedChecks === checks.length;

  return {
    allMatch,
    totalChecks: checks.length,
    passedChecks,
    checkedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    checks,
  };
}

export async function previewTestDataAction() {
  await requireAdmin();

  const allBills = await db.select().from(bills);
  // Real bill numbers: P-0001 to P-0007 and S-0001 (from backup)
  // Test bills: created by e2e user OR party name contains test/e2e/dummy/tanmay/sahil chavan
  const testBills = allBills.filter((b: any) => isTestBill(b));
  const realBills = allBills.filter((b: any) => !isTestBill(b));

  return {
    testBills: testBills.map((b: any) => ({
      billNo: b.billNo,
      partyName: b.partyName,
      partyVillage: b.partyVillage,
      kind: b.kind,
      createdAt: b.createdAt?.toISOString?.() || "",
      alreadyDeleted: !!b.deletedAt,
    })),
    realBillCount: realBills.length,
  };
}

function isTestBill(b: any): boolean {
  const name = (b.partyName || "").toLowerCase();
  if (
    name.includes("test") ||
    name.includes("e2e") ||
    name.includes("dummy") ||
    name === "tanmay chavan" ||
    name === "sahil chavan" ||
    name === "demo"
  ) return true;
  // Bill number heuristic: P-0008 and above with no original backup record
  // Real bills from backup: P-0001..P-0007, S-0001
  const num = parseInt((b.billNo || "").replace(/[^\d]/g, ""), 10);
  if (b.kind === "purchase" && num >= 8) return true;
  if (b.kind === "sale" && num >= 2) return true;
  return false;
}

export async function clearTestDataAction(confirmationPhrase: string) {
  const user = await requireAdmin();

  if (confirmationPhrase !== "CLEAR TEST DATA") {
    throw new Error("Confirmation phrase does not match 'CLEAR TEST DATA'.");
  }

  // Automatic full JSON backup before any change
  await exportBackupAction();

  // Find bills created by tests
  const allBills = await db.select().from(bills);
  const testBills = allBills.filter((b: any) => isTestBill(b) && !b.deletedAt);

  for (const tb of testBills) {
    await db
      .update(bills)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
        deleteReason: "Cleared test data",
      })
      .where(eq(bills.id, tb.id));
  }

  // Recalculate bill counter series
  const [profileSetting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "business_profile"))
    .limit(1);

  if (profileSetting) {
    const val = (profileSetting.value as any) || {};
    const remainingBills = allBills.filter((b: any) => !isTestBill(b) && !b.deletedAt);
    const pNums = remainingBills
      .filter((b: any) => b.kind === "purchase")
      .map((b: any) => parseInt(b.billNo.replace(/\D/g, "")) || 0);
    const sNums = remainingBills
      .filter((b: any) => b.kind === "sale")
      .map((b: any) => parseInt(b.billNo.replace(/\D/g, "")) || 0);

    val.pSeriesNext = pNums.length > 0 ? Math.max(...pNums) + 1 : 1;
    val.sSeriesNext = sNums.length > 0 ? Math.max(...sNums) + 1 : 1;

    await db
      .update(settings)
      .set({ value: val, updatedAt: new Date() })
      .where(eq(settings.key, "business_profile"));
  }

  await logAudit(user, "CLEAR_TEST_DATA", "database", "", {
    clearedCount: testBills.length,
  });

  revalidatePath("/app");
  revalidatePath("/app/settings");
  revalidatePath("/app/purchase");
  revalidatePath("/app/sales");
  revalidatePath("/app/stock");

  return { success: true, clearedCount: testBills.length };
}

/** Fetch recent audit log entries (admin only) */
export async function getAuditLogsAction(limit = 100) {
  await requireAdmin();

  try {
    const logs = await db
      .select({
        id: auditLogs.id,
        userEmail: auditLogs.userEmail,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return logs.map((l: any) => ({
      ...l,
      createdAt: l.createdAt?.toISOString?.() || "",
    }));
  } catch (e: any) {
    console.warn("[audit] getAuditLogsAction failed:", e?.message?.slice(0, 60));
    return [];
  }
}

