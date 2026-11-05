import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq, isNull, and, sql, asc } from "drizzle-orm";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

async function executeRaw(sqlText: string) {
  return await db.execute(sql.raw(sqlText));
}

async function runMigration() {
  console.log("=== STEP 1: Creating payment_allocations and bill_shares tables ===");

  const ddl = `
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bill_shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ DEFAULT NULL,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_allocations_payment ON payment_allocations(payment_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_bill ON payment_allocations(bill_id);
    CREATE INDEX IF NOT EXISTS idx_shares_token ON bill_shares(token);
    CREATE INDEX IF NOT EXISTS idx_shares_bill ON bill_shares(bill_id);
  `;

  await executeRaw(ddl);
  console.log("✅ DDL executed successfully.");

  console.log("=== STEP 2: Fetching live bills, items, and payments ===");
  const allBills = await db.select().from(schema.bills);
  const allBillItems = await db.select().from(schema.billItems);
  const allPayments = await db.select().from(schema.payments);
  const allParties = await db.select().from(schema.parties);

  const billTotals = new Map<string, number>();
  for (const item of allBillItems) {
    const cur = billTotals.get(item.billId) || 0;
    billTotals.set(item.billId, cur + Number(item.totalAmount));
  }

  // Clear existing allocations to rebuild cleanly
  await executeRaw("DELETE FROM payment_allocations;");

  console.log("=== STEP 3: Linking Bill 'paidNow' as Payments + Allocations ===");
  for (const bill of allBills) {
    const paidVal = Number(bill.paidNow) || 0;
    if (paidVal <= 0) continue;

    // Check if a payment for this bill already exists
    let existingPayment = allPayments.find(
      (p: any) => p.billId === bill.id && Number(p.amount) === paidVal
    );

    if (!existingPayment) {
      const partyType = bill.kind === "purchase" ? "farmer" : "client";
      const [inserted] = await db
        .insert(schema.payments)
        .values({
          partyId: bill.partyId,
          billId: bill.id,
          partyName: bill.partyName,
          paymentDate: bill.billDate,
          partyType,
          amount: paidVal.toString(),
          kind: "payment",
          mode: "cash",
          note: `बिल ${bill.billNo} सोबत ${bill.kind === "purchase" ? "दिलेली" : "मिळालेली"} रक्कम`,
          createdBy: bill.createdBy,
          deletedAt: bill.deletedAt,
          deletedBy: bill.deletedBy,
          deleteReason: bill.deleteReason,
        })
        .returning();
      existingPayment = inserted;
      console.log(`Created linked payment for ${bill.billNo}: ₹${paidVal}`);
    }

    // Allocate to this bill
    const gross = billTotals.get(bill.id) || 0;
    const net = Math.max(0, gross - Number(bill.hamali || 0));
    const allocAmount = Math.min(paidVal, net);

    if (existingPayment) {
      await db.insert(schema.paymentAllocations).values({
        paymentId: existingPayment.id,
        billId: bill.id,
        amount: allocAmount.toString(),
      });
      console.log(`Allocated ₹${allocAmount} from payment ${existingPayment.id} to bill ${bill.billNo}`);
    }
  }

  console.log("=== STEP 4: Allocating Standalone Payments FIFO ===");
  const freshPayments = await db.select().from(schema.payments);
  const activeStandalonePayments = freshPayments.filter(
    (p: any) => !p.billId && !p.deletedAt && Number(p.amount) > 0
  );

  // Group open bills by party
  for (const party of allParties) {
    const partyPayments = activeStandalonePayments.filter(
      (p: any) =>
        p.partyId === party.id ||
        p.partyName.trim().toLowerCase() === party.name.trim().toLowerCase()
    );

    if (partyPayments.length === 0) continue;

    // Fetch active open bills for party
    const partyBills = allBills.filter(
      (b: any) =>
        !b.deletedAt &&
        (b.partyId === party.id ||
          b.partyName.trim().toLowerCase() === party.name.trim().toLowerCase())
    );

    // Sort bills by date ascending (FIFO)
    partyBills.sort((a: any, b: any) => a.billDate.localeCompare(b.billDate));

    for (const payment of partyPayments) {
      let remainingPayment = Number(payment.amount);

      for (const bill of partyBills) {
        if (remainingPayment <= 0) break;

        const gross = billTotals.get(bill.id) || 0;
        const net = Math.max(0, gross - Number(bill.hamali || 0));

        // Get already allocated to this bill
        const existingAllocs = await db
          .select()
          .from(schema.paymentAllocations)
          .where(eq(schema.paymentAllocations.billId, bill.id));
        const totalAllocated = existingAllocs.reduce(
          (sum: number, a: any) => sum + Number(a.amount),
          0
        );

        const openDue = Math.max(0, net - totalAllocated);
        if (openDue > 0) {
          const allocateNow = Math.min(remainingPayment, openDue);
          await db.insert(schema.paymentAllocations).values({
            paymentId: payment.id,
            billId: bill.id,
            amount: allocateNow.toString(),
          });
          remainingPayment -= allocateNow;
          console.log(
            `FIFO: Allocated ₹${allocateNow} from standalone payment ${payment.id} to ${bill.billNo} (${bill.partyName}). Remaining due on bill: ₹${openDue - allocateNow}`
          );
        }
      }

      if (remainingPayment > 0) {
        console.log(
          `Surplus unallocated advance for ${party.name}: ₹${remainingPayment}`
        );
      }
    }
  }

  console.log("\n=== RECONCILIATION REPORT (AFTER MIGRATION) ===");
  const finalBills = await db.select().from(schema.bills);
  const finalPayments = await db.select().from(schema.payments);
  const finalAllocs = await db.select().from(schema.paymentAllocations);

  for (const b of finalBills) {
    if (b.deletedAt) continue;
    const gross = billTotals.get(b.id) || 0;
    const net = Math.max(0, gross - Number(b.hamali || 0));
    const allocs = finalAllocs.filter((a: any) => a.billId === b.id);
    const paid = allocs.reduce((sum: number, a: any) => sum + Number(a.amount), 0);
    const due = net - paid;
    console.log(
      `Bill: ${b.billNo} | Party: ${b.partyName} | Net: ₹${net} | Paid: ₹${paid} | Due: ₹${due} | Status: ${due <= 0 ? "पूर्ण भरले (Paid)" : due < net ? "अंशतः (Partial)" : "बाकी (Open)"}`
    );
  }

  console.log("\n=== ADITI MANDRE ACCEPTANCE CHECK ===");
  const aditiBill = finalBills.find((b: any) => b.billNo === "P-0005");
  if (aditiBill) {
    const gross = billTotals.get(aditiBill.id) || 0;
    const net = Math.max(0, gross - Number(aditiBill.hamali || 0));
    const allocs = finalAllocs.filter((a: any) => a.billId === aditiBill.id);
    const paid = allocs.reduce((sum: number, a: any) => sum + Number(a.amount), 0);
    const due = net - paid;
    console.log(`P-0005 Net: ₹${net}`);
    console.log(`P-0005 Total Paid (from allocations): ₹${paid}`);
    console.log(`P-0005 Due: ₹${due}`);
    console.log(`Acceptance criteria (P-0005 due === 5640): ${due === 5640 ? "✅ PASSED" : "❌ FAILED"}`);
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });

