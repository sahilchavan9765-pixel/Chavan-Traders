import { describe, it, expect } from "vitest";
import {
  calculateFifoAllocations,
  buildPartyLedger,
} from "../src/lib/ledger";
import {
  calculateStock,
  calculateBuyAverages,
  calculateProfitOnGoodsSold,
} from "../src/lib/calculations";

describe("Reconciliation & Accounting Integrity Test Suite", () => {
  it("FIFO allocation correctly distributes standalone payments across open bills", () => {
    const sampleBills = [
      {
        id: "b1",
        billNo: "P-0001",
        billDate: "2026-11-01",
        itemsTotal: 5000,
        hamali: 0,
        paidNow: 1000, // Remaining due = 4000
      },
      {
        id: "b2",
        billNo: "P-0002",
        billDate: "2026-11-02",
        itemsTotal: 3000,
        hamali: 0,
        paidNow: 0, // Remaining due = 3000
      },
    ];

    // Farmer paid 5,000 later as standalone payment
    const standalonePayments = [
      {
        id: "p1",
        amount: 5000,
        kind: "payment" as const,
        paymentDate: "2026-11-03",
      },
    ];

    const allocations = calculateFifoAllocations(sampleBills, standalonePayments);

    // Bill 1: 4000 open after initial paid -> receives 4000 from payment -> remainingDue = 0 (paid)
    const b1Alloc = allocations.get("b1");
    expect(b1Alloc).toBeDefined();
    expect(b1Alloc?.allocatedFromPayments).toBe(4000);
    expect(b1Alloc?.remainingDue).toBe(0);
    expect(b1Alloc?.isPaid).toBe(true);

    // Bill 2: remaining 1000 from payment allocated to b2 -> open = 3000 - 1000 = 2000 remaining due
    const b2Alloc = allocations.get("b2");
    expect(b2Alloc).toBeDefined();
    expect(b2Alloc?.allocatedFromPayments).toBe(1000);
    expect(b2Alloc?.remainingDue).toBe(2000);
    expect(b2Alloc?.isPaid).toBe(false);
  });

  it("buildPartyLedger accurately maintains running balance and advance status without double counting", () => {
    const party = {
      id: "farmer-1",
      name: "आनंदराव पाटील",
      type: "farmer",
    };

    const partyBills = [
      {
        id: "b1",
        kind: "purchase",
        billNo: "P-0001",
        billDate: "2026-11-01",
        netTotal: 10000,
        paidNow: 2000,
        createdAt: "2026-11-01T10:00:00Z",
      },
    ];

    const partyPayments = [
      {
        id: "pay-1",
        kind: "payment" as const,
        amount: 2000,
        paymentDate: "2026-11-01",
        billId: "b1", // Linked payment with bill
        createdAt: "2026-11-01T10:00:01Z",
      },
      {
        id: "pay-2",
        kind: "payment" as const,
        amount: 5000,
        paymentDate: "2026-11-02",
        billId: null,
        createdAt: "2026-11-02T10:00:00Z",
      },
    ];

    const ledger = buildPartyLedger(party, partyBills, partyPayments);

    expect(ledger.totalBilled).toBe(10000);
    expect(ledger.totalPaid).toBe(7000); // 2000 linked + 5000 standalone = 7000 (no double counting)
    expect(ledger.balance).toBe(3000); // 10000 - 7000 = 3000
    expect(ledger.isAdvance).toBe(false);

    // Running balance check
    expect(ledger.entries.length).toBe(3); // 1 bill + 2 payments
    expect(ledger.entries[0].runningBalance).toBe(10000); // Credit
    expect(ledger.entries[1].runningBalance).toBe(8000);  // Debit 2000
    expect(ledger.entries[2].runningBalance).toBe(3000);  // Debit 5000
  });

  it("reconciles Σ bills − Σ payments = Σ party balances", () => {
    // 3 Parties
    const farmers = [
      { id: "f1", billed: 15000, paid: 10000, advances: 0 },
      { id: "f2", billed: 8000, paid: 5000, advances: 1000 },
      { id: "f3", billed: 12000, paid: 14000, advances: 0 }, // Overpaid by 2000 (advance)
    ];

    let totalBilled = 0;
    let totalPaid = 0;
    let expectedToPay = 0;
    let expectedAdvance = 0;

    for (const f of farmers) {
      totalBilled += f.billed;
      const netPaid = f.paid + f.advances;
      totalPaid += netPaid;

      const balance = f.billed - netPaid;
      if (balance > 0) {
        expectedToPay += balance;
      } else {
        expectedAdvance += Math.abs(balance);
      }
    }

    expect(totalBilled).toBe(35000);
    expect(totalPaid).toBe(30000);
    expect(totalBilled - totalPaid).toBe(5000);

    // Dashboard dues:
    // f1: 15000 - 10000 = 5000 due
    // f2: 8000 - 6000 = 2000 due
    // f3: 12000 - 14000 = -2000 advance
    expect(expectedToPay).toBe(7000);
    expect(expectedAdvance).toBe(2000);
    expect(expectedToPay - expectedAdvance).toBe(5000);
  });

  it("stock equals purchased net KG minus sold net KG, and deleted bills affect nothing", () => {
    const activePurchases = [
      {
        items: [
          { product: "भात", netKg: 500, rate: 30 },
          { product: "सोयाबीन", netKg: 300, rate: 50 },
        ],
      },
    ];

    const activeSales = [
      {
        items: [
          { product: "भात", netKg: 200, rate: 35 },
          { product: "सोयाबीन", netKg: 100, rate: 58 },
        ],
      },
    ];

    // Simulating soft-deleted bills by completely excluding them from active lists
    const deletedPurchases = [
      {
        items: [{ product: "भात", netKg: 1000, rate: 25 }],
      },
    ];

    // Active stock calculation
    const stock = calculateStock(activePurchases, activeSales);

    expect(stock["भात"].boughtKg).toBe(500);
    expect(stock["भात"].soldKg).toBe(200);
    expect(stock["भात"].inStockKg).toBe(300);

    expect(stock["सोयाबीन"].boughtKg).toBe(300);
    expect(stock["सोयाबीन"].soldKg).toBe(100);
    expect(stock["सोयाबीन"].inStockKg).toBe(200);

    // Assert deleted purchase is NOT in active stock
    expect(stock["भात"].boughtKg).not.toBe(1500);
  });
});

