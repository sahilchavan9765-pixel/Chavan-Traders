import { describe, it, expect } from "vitest";
import {
  calculateUnifiedStock,
  normalizeCommodity,
  RawBill,
  RawBillItem,
  RawAdjustment,
} from "../src/lib/stock";

describe("Unified Stock Calculation Engine", () => {
  it("normalizes Marathi, English and mixed produce names correctly", () => {
    expect(normalizeCommodity("भात").code).toBe("RICE");
    expect(normalizeCommodity("Rice / Paddy").code).toBe("RICE");
    expect(normalizeCommodity("भात (Rice / Paddy)").code).toBe("RICE");
    expect(normalizeCommodity("सोयाबीन").code).toBe("SOYBEAN");
    expect(normalizeCommodity("Soybean (A)").code).toBe("SOYBEAN");
    expect(normalizeCommodity("गहू").code).toBe("WHEAT"); // गहू is now a known commodity
    expect(normalizeCommodity("नाचणी").code).toBe("NACHANI"); // Finger Millet is now known
    expect(normalizeCommodity("Finger Millet").code).toBe("NACHANI");
    expect(normalizeCommodity("unknown_xyzzy_123").code).toContain("OTHER_"); // truly unknown still falls back
  });

  it("passes the worked example: 100 KG Rice @ ₹30 + 100 KG @ ₹40 with sales and adjustments", () => {
    // 1. Two purchases of Rice
    const bills: RawBill[] = [
      {
        id: "b1",
        kind: "purchase",
        billNo: "P-0001",
        billDate: "2026-11-01",
        partyName: "Farmer A",
      },
      {
        id: "b2",
        kind: "purchase",
        billNo: "P-0002",
        billDate: "2026-11-02",
        partyName: "Farmer B",
      },
      {
        id: "b3",
        kind: "sale",
        billNo: "S-0001",
        billDate: "2026-11-03",
        partyName: "Client C",
      },
    ];

    const items: RawBillItem[] = [
      {
        billId: "b1",
        productName: "भात (Rice / Paddy)",
        netKg: 100,
        ratePerKg: 30, // 100 * 30 = 3000
      },
      {
        billId: "b2",
        productName: "Rice (A)",
        netKg: 100,
        ratePerKg: 40, // 100 * 40 = 4000
      },
      {
        billId: "b3",
        productName: "भात",
        netKg: 50,
        ratePerKg: 45, // 50 KG sold
      },
    ];

    const adjustments: RawAdjustment[] = [
      {
        id: "adj1",
        product: "भात",
        date: "2026-11-04",
        kgChange: -10, // 10 KG wastage
        reason: "wastage",
        note: "Damaged bag",
      },
    ];

    const { stockReport, totalValuation, totalInStockKg, movements } =
      calculateUnifiedStock(bills, items, adjustments);

    const riceStock = stockReport.find((s) => s.code === "RICE");
    expect(riceStock).toBeDefined();

    // Bought: 100 + 100 = 200 KG
    expect(riceStock?.boughtKg).toBe(200);

    // Weighted average buy rate: (100*30 + 100*40) / 200 = 7000 / 200 = ₹35.00
    expect(riceStock?.avgBuyRate).toBe(35);

    // Sold: 50 KG
    expect(riceStock?.soldKg).toBe(50);

    // Adjustment: -10 KG
    expect(riceStock?.adjustmentKg).toBe(-10);

    // In Stock: 200 - 50 - 10 = 140 KG
    expect(riceStock?.inStockKg).toBe(140);

    // Valuation: 140 KG * ₹35.00 = ₹4,900
    expect(riceStock?.valuation).toBe(4900);

    // Movements count: 2 purchases + 1 sale + 1 adjustment = 4
    expect(movements.length).toBe(4);
  });

  it("excludes soft-deleted bills from stock totals", () => {
    const bills: RawBill[] = [
      {
        id: "b1",
        kind: "purchase",
        billNo: "P-0001",
        billDate: "2026-11-01",
        partyName: "Farmer A",
        deletedAt: new Date(), // DELETED
      },
      {
        id: "b2",
        kind: "purchase",
        billNo: "P-0002",
        billDate: "2026-11-02",
        partyName: "Farmer B",
      },
    ];

    const items: RawBillItem[] = [
      {
        billId: "b1",
        productName: "सोयाबीन",
        netKg: 500,
        ratePerKg: 45,
      },
      {
        billId: "b2",
        productName: "Soybean",
        netKg: 200,
        ratePerKg: 46,
      },
    ];

    const { stockReport } = calculateUnifiedStock(bills, items, []);
    const soybean = stockReport.find((s) => s.code === "SOYBEAN");
    expect(soybean?.boughtKg).toBe(200); // Only non-deleted bill counted
    expect(soybean?.inStockKg).toBe(200);
  });
});

