import { describe, it, expect } from "vitest";
import {
  normalizeMarathiDigits,
  parseBagWeights,
  calculateGrossWeight,
  calculateNetWeight,
  calculateItemTotal,
  calculateBillTotal,
  calculateBalanceDue,
  formatIndianCurrency,
  formatWeight,
  formatWhatsAppPhone,
  numberToMarathiWords,
  calculateBuyAverages,
  calculateStock,
  calculateProfitOnGoodsSold,
  generateWhatsAppBillMessage,
} from "../src/lib/calculations";

describe("Chavan Traders Business Logic Engine", () => {
  it("normalizes Marathi numerals ०-९ to Western digits", () => {
    expect(normalizeMarathiDigits("१२३४५६७८९०")).toBe("1234567890");
    expect(normalizeMarathiDigits("३४ ३८ ३३")).toBe("34 38 33");
  });

  it("parses bag weights typed as spaces, commas or plus signs", () => {
    expect(parseBagWeights("34 38 33")).toEqual([34, 38, 33]);
    expect(parseBagWeights("50.5, 51.2, 49.8")).toEqual([50.5, 51.2, 49.8]);
    expect(parseBagWeights("35+40+45")).toEqual([35, 40, 45]);
  });

  it("parses Marathi typed bag weights", () => {
    expect(parseBagWeights("५० ५१.५ ४८")).toEqual([50, 51.5, 48]);
  });

  it("calculates gross and net weight with deduction cut", () => {
    const bags = [34, 38, 33]; // sum = 105
    expect(calculateGrossWeight(bags)).toBe(105);
    expect(calculateNetWeight(bags, 5)).toBe(100);
  });

  it("computes row amount, bill total with hamali deduction, and balance due", () => {
    const netKg = 100;
    const rate = 45; // 4500
    const rowAmt = calculateItemTotal(netKg, rate);
    expect(rowAmt).toBe(4500);

    const billTotal = calculateBillTotal([rowAmt], 100); // 4500 - 100 = 4400
    expect(billTotal).toBe(4400);

    const due = calculateBalanceDue(billTotal, 1400); // 4400 - 1400 = 3000
    expect(due).toBe(3000);
  });

  it("formats Indian currency and weight correctly", () => {
    expect(formatIndianCurrency(123456)).toBe("₹1,23,456");
    expect(formatWeight(105.5)).toBe("105.5 KG");
  });

  it("formats 10-digit Indian phones with 91 prefix for WhatsApp", () => {
    expect(formatWhatsAppPhone("9850815527")).toBe("919850815527");
    expect(formatWhatsAppPhone("+91 9850815527")).toBe("919850815527");
  });

  it("converts numbers to exact Marathi words up to crores", () => {
    expect(numberToMarathiWords(0)).toBe("शून्य");
    expect(numberToMarathiWords(50)).toBe("पन्नास");
    expect(numberToMarathiWords(100)).toBe("शंभर");
    expect(numberToMarathiWords(150)).toBe("एकशे पन्नास");
    expect(numberToMarathiWords(235)).toBe("दोनशे पस्तीस");
    expect(numberToMarathiWords(4400)).toBe("चार हजार चारशे");
    expect(numberToMarathiWords(125000)).toBe("एक लाख पंचवीस हजार");
    expect(numberToMarathiWords(10000000)).toBe("एक कोटी");
  });

  it("calculates weighted buy average rate and stock accurately", () => {
    const purchases = [
      {
        items: [
          { product: "Soybean", netKg: 100, rate: 40 }, // 4000
          { product: "Soybean", netKg: 100, rate: 50 }, // 5000 -> avg = 9000 / 200 = 45
        ],
      },
    ];

    const sales = [
      {
        items: [
          { product: "Soybean", netKg: 120, rate: 55 },
        ],
      },
    ];

    const buyAvg = calculateBuyAverages(purchases);
    expect(buyAvg["Soybean"].avgRate).toBe(45);

    const stock = calculateStock(purchases, sales);
    expect(stock["Soybean"].boughtKg).toBe(200);
    expect(stock["Soybean"].soldKg).toBe(120);
    expect(stock["Soybean"].inStockKg).toBe(80);

    // Profit on 120 kg sold = (55 - 45) * 120 = 1200
    const profit = calculateProfitOnGoodsSold(sales, buyAvg);
    expect(profit).toBe(1200);
  });

  it("generates authentic Marathi WhatsApp bill text", () => {
    const msg = generateWhatsAppBillMessage({
      kind: "pur",
      date: "2026-11-03",
      name: "आनंद पाटील",
      place: "उत्तूर",
      items: [
        {
          product: "सोयाबीन",
          grade: "Grade A",
          bags: [34, 38, 33],
          cut: 5,
          netKg: 100,
          rate: 50,
        },
      ],
      hamali: 100,
      total: 4900,
      paidNow: 1900,
    });

    expect(msg).toContain("*चव्हाण ट्रेडर्स*");
    expect(msg).toContain("कै. श्री. रमेश कृष्णा चव्हाण");
    expect(msg).toContain("खरेदी बिल – 2026-11-03");
    expect(msg).toContain("आनंद पाटील (उत्तूर)");
    expect(msg).toContain("सोयाबीन (Grade A): 34+38+33 − 5 = 100 KG × ₹50 = ₹5,000");
    expect(msg).toContain("हमाली: − ₹100");
    expect(msg).toContain("एकूण: ₹4,900");
    expect(msg).toContain("दिले: ₹1,900");
    expect(msg).toContain("बाकी: ₹3,000");
    expect(msg).toContain("धन्यवाद! 📞 9765941078");
  });
});
