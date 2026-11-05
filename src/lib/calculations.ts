/**
 * Core business calculation engine for Chavan Traders (चव्हाण ट्रेडर्स)
 * Source of truth: /reference/old-site/chavan-traders.html
 */

export const MARATHI_WORDS =
  "शून्य,एक,दोन,तीन,चार,पाच,सहा,सात,आठ,नऊ,दहा,अकरा,बारा,तेरा,चौदा,पंधरा,सोळा,सतरा,अठरा,एकोणीस,वीस,एकवीस,बावीस,तेवीस,चोवीस,पंचवीस,सव्वीस,सत्तावीस,अठ्ठावीस,एकोणतीस,तीस,एकतीस,बत्तीस,तेहतीस,चौतीस,पस्तीस,छत्तीस,सदतीस,अडतीस,एकोणचाळीस,चाळीस,एक्केचाळीस,बेचाळीस,त्रेचाळीस,चौरेचाळीस,पंचेचाळीस,शेहेचाळीस,सत्तेचाळीस,अठ्ठेचाळीस,एकोणपन्नास,पन्नास,एक्कावन्न,बावन्न,त्रेपन्न,चोपन्न,पंचावन्न,छप्पन्न,सत्तावन्न,अठ्ठावन्न,एकोणसाठ,साठ,एकसष्ट,बासष्ट,त्रेसष्ट,चौसष्ट,पासष्ट,सहासष्ट,सदुसष्ट,अडुसष्ट,एकोणसत्तर,सत्तर,एक्काहत्तर,बाहत्तर,त्र्याहत्तर,चौऱ्याहत्तर,पंचाहत्तर,शहात्तर,सत्याहत्तर,अठ्ठ्याहत्तर,एकोणऐंशी,ऐंशी,एक्क्याऐंशी,ब्याऐंशी,त्र्याऐंशी,चौऱ्याऐंशी,पंचाऐंशी,शहाऐंशी,सत्त्याऐंशी,अठ्ठ्याऐंशी,एकोणनव्वद,नव्वद,एक्क्याण्णव,ब्याण्णव,त्र्याण्णव,चौऱ्याण्णव,पंच्याण्णव,शहाण्णव,सत्त्याण्णव,अठ्ठ्याण्णव,नव्व्याण्णव".split(
    ","
  );

/**
 * Converts Marathi numerals ०-९ into standard 0-9 digits
 */
export function normalizeMarathiDigits(input: string): string {
  if (!input) return "";
  return input.replace(/[०-९]/g, (char) => {
    return String(char.charCodeAt(0) - 2406);
  });
}

/**
 * Parses bag weights typed as "34 38 33" or "34, 38, 33" or "34+38+33"
 * supporting both English and Marathi digits
 */
export function parseBagWeights(input: string): number[] {
  if (!input) return [];
  const normalized = normalizeMarathiDigits(input);
  return normalized
    .split(/[\s,+]+/)
    .map((val) => parseFloat(val))
    .filter((num) => !isNaN(num) && num > 0);
}

/**
 * Gross weight = sum of bag weights
 */
export function calculateGrossWeight(bagWeights: number[]): number {
  return Math.round(bagWeights.reduce((sum, weight) => sum + weight, 0) * 1000) / 1000;
}

/**
 * Net weight = sum of bags - cut KG (or gross weight - cut KG)
 */
export function calculateNetWeight(
  bagWeightsOrGross: number[] | number,
  cutKg: number = 0
): number {
  const gross = Array.isArray(bagWeightsOrGross)
    ? calculateGrossWeight(bagWeightsOrGross)
    : Number(bagWeightsOrGross) || 0;
  const net = Math.max(0, gross - (cutKg || 0));
  return Math.round(net * 1000) / 1000;
}

/**
 * Item row total = net KG * rate per KG
 */
export function calculateItemTotal(netKg: number, ratePerKg: number): number {
  if (netKg <= 0 || ratePerKg <= 0) return 0;
  return Math.round(netKg * ratePerKg * 100) / 100;
}

export interface BillItemCalc {
  product: string;
  grade?: string;
  bags: number[];
  cut: number;
  netKg: number;
  rate: number;
}

/**
 * Bill total = sum of item totals - hamali
 */
export function calculateBillTotal(itemTotals: number[], hamali: number = 0): number {
  const subtotal = itemTotals.reduce((sum, amount) => sum + amount, 0);
  const total = Math.max(0, subtotal - (hamali || 0));
  return Math.round(total * 100) / 100;
}

/**
 * Balance due = Bill total - paid now
 */
export function calculateBalanceDue(billTotal: number, paidNow: number = 0): number {
  const due = billTotal - (paidNow || 0);
  return Math.round(due * 100) / 100;
}

/**
 * Indian currency formatter (₹1,23,456)
 */
export function formatIndianCurrency(amount: number): string {
  const rounded = Math.round(amount || 0);
  return "₹" + rounded.toLocaleString("en-IN");
}

/**
 * Weight formatter (e.g. 105 KG)
 */
export function formatWeight(kg: number): string {
  return (Math.round((kg || 0) * 100) / 100).toLocaleString("en-IN") + " KG";
}

/**
 * Formats 10-digit Indian mobile number for wa.me link (prefixes 91)
 */
export function formatWhatsAppPhone(phone: string): string {
  const clean = (phone || "").replace(/\D/g, "");
  return clean.length === 10 ? "91" + clean : clean;
}

/**
 * Generates exact Marathi number in words (e.g. 1250 -> एक हजार दोनशे पन्नास)
 */
export function numberToMarathiWords(n: number): string {
  n = Math.round(n);
  if (n <= 0) return "शून्य";
  const r: string[] = [];

  const denominations: [number, string][] = [
    [10000000, "कोटी"],
    [100000, "लाख"],
    [1000, "हजार"],
  ];

  denominations.forEach(([value, word]) => {
    if (n >= value) {
      const quotient = Math.floor(n / value) % 100;
      if (quotient > 0) {
        r.push(MARATHI_WORDS[quotient] + " " + word);
      }
      n %= value;
    }
  });

  if (n >= 100) {
    const h = Math.floor(n / 100);
    r.push(h === 1 ? (n % 100 ? "एकशे" : "शंभर") : MARATHI_WORDS[h] + "शे");
    n %= 100;
  }

  if (n > 0) {
    r.push(MARATHI_WORDS[n]);
  }

  return r.join(" ");
}

/**
 * Calculates weighted average buy rate per product across all purchase bills
 */
export function calculateBuyAverages(
  purchases: Array<{ items: Array<{ product: string; netKg: number; rate: number }> }>
): Record<string, { totalKg: number; totalAmt: number; avgRate: number }> {
  const map: Record<string, { totalKg: number; totalAmt: number; avgRate: number }> = {};

  purchases.forEach((bill) => {
    bill.items.forEach((item) => {
      if (!map[item.product]) {
        map[item.product] = { totalKg: 0, totalAmt: 0, avgRate: 0 };
      }
      map[item.product].totalKg += item.netKg;
      map[item.product].totalAmt += item.netKg * item.rate;
    });
  });

  Object.keys(map).forEach((prod) => {
    const entry = map[prod];
    entry.avgRate = entry.totalKg > 0 ? entry.totalAmt / entry.totalKg : 0;
  });

  return map;
}

/**
 * Calculates stock balance per product: Total bought - Total sold
 */
export function calculateStock(
  purchases: Array<{ items: Array<{ product: string; netKg: number; rate: number }> }>,
  sales: Array<{ items: Array<{ product: string; netKg: number; rate: number }> }>
): Record<string, { boughtKg: number; soldKg: number; inStockKg: number }> {
  const stock: Record<string, { boughtKg: number; soldKg: number; inStockKg: number }> = {};

  purchases.forEach((b) => {
    b.items.forEach((i) => {
      if (!stock[i.product]) stock[i.product] = { boughtKg: 0, soldKg: 0, inStockKg: 0 };
      stock[i.product].boughtKg += i.netKg;
    });
  });

  sales.forEach((b) => {
    b.items.forEach((i) => {
      if (!stock[i.product]) stock[i.product] = { boughtKg: 0, soldKg: 0, inStockKg: 0 };
      stock[i.product].soldKg += i.netKg;
    });
  });

  Object.keys(stock).forEach((p) => {
    stock[p].inStockKg = stock[p].boughtKg - stock[p].soldKg;
  });

  return stock;
}

/**
 * Profit on goods sold = sum over sold items of (sale rate - avg buy rate) * sold KG
 */
export function calculateProfitOnGoodsSold(
  sales: Array<{ items: Array<{ product: string; netKg: number; rate: number }> }>,
  buyAverages: Record<string, { avgRate: number }>
): number {
  let profit = 0;
  sales.forEach((bill) => {
    bill.items.forEach((item) => {
      const avg = buyAverages[item.product];
      if (avg && avg.avgRate > 0) {
        profit += (item.rate - avg.avgRate) * item.netKg;
      }
    });
  });
  return Math.round(profit * 100) / 100;
}

/**
 * Formats exact WhatsApp bill message in Marathi (from billMsg in reference)
 */
export function generateWhatsAppBillMessage(bill: {
  kind: "pur" | "sal" | "purchase" | "sale";
  date?: string;
  billDate?: string;
  name?: string;
  partyName?: string;
  partyPhone?: string;
  billNo?: string;
  place?: string;
  village?: string;
  items: Array<{
    product: string;
    grade?: string;
    bags?: number[] | any;
    cut?: number;
    cutKg?: number;
    netKg: number;
    rate: number;
    total?: number;
  }>;
  hamali?: number;
  total?: number;
  totalAmount?: number;
  paidNow: number;
  balanceDue?: number;
}): string {
  const isPur = bill.kind === "pur" || bill.kind === "purchase";
  const billTotal = bill.totalAmount ?? bill.total ?? 0;
  const due = bill.balanceDue ?? (billTotal - bill.paidNow);
  const partyDisplayName = bill.partyName || bill.name || (isPur ? "शेतकरी" : "ग्राहक");
  const dateStr = bill.billDate || bill.date || "";
  const locationStr = bill.village || bill.place || "";
  const billNoStr = bill.billNo ? ` [${bill.billNo}]` : "";

  const itemLines = bill.items
    .map((item) => {
      const gradeStr = item.grade ? ` (${item.grade})` : "";
      const bagsArr = Array.isArray(item.bags) ? item.bags : [];
      const cutVal = Number(item.cutKg ?? item.cut ?? 0);
      const bagsStr =
        bagsArr.length > 0
          ? `${bagsArr.join("+")}${cutVal > 0 ? ` − ${cutVal}` : ""} = `
          : "";
      const lineAmt = item.total ? item.total : item.netKg * item.rate;
      return `${item.product}${gradeStr}: ${bagsStr}${item.netKg} KG × ₹${item.rate} = ${formatIndianCurrency(lineAmt)}`;
    })
    .join("\n");

  const hamaliLine =
    Number(bill.hamali) > 0
      ? `\nहमाली: − ${formatIndianCurrency(Number(bill.hamali))}`
      : "";

  return (
    `*चव्हाण ट्रेडर्स*${billNoStr}\n` +
    `कै. श्री. रमेश कृष्णा चव्हाण\n` +
    `${isPur ? "खरेदी बिल" : "विक्री बिल"} – ${dateStr}\n` +
    `${partyDisplayName}${locationStr ? ` (${locationStr})` : ""}\n\n` +
    `${itemLines}` +
    `${hamaliLine}\n\n` +
    `एकूण: ${formatIndianCurrency(billTotal)}\n` +
    `${isPur ? "दिले" : "मिळाले"}: ${formatIndianCurrency(bill.paidNow)}\n` +
    `बाकी: ${formatIndianCurrency(due)}\n\n` +
    `धन्यवाद! 📞 9765941078`
  );
}

/**
 * Format date string from YYYY-MM-DD to DD-MM-YYYY
 */
export function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

