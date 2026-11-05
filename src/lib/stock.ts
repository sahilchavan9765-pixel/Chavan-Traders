export interface StockMovement {
  id: string;
  date: string;
  type: "purchase" | "sale" | "adjustment";
  referenceNo: string;
  partyName: string;
  product: string;
  inKg: number;
  outKg: number;
  ratePerKg: number;
  runningBalance?: number; // cumulative balance for this commodity at this point in time
  reason?: string;
  note?: string;
}

export interface CommodityStockSummary {
  key: string;
  code: string;
  nameMr: string;
  nameEn: string;
  boughtKg: number;
  soldKg: number;
  adjustmentKg: number;
  inStockKg: number;
  avgBuyRate: number;
  valuation: number;
  grades: Record<string, { boughtKg: number; soldKg: number; inStockKg: number }>;
}

export const KNOWN_COMMODITIES: Array<{
  code: string;
  nameMr: string;
  nameEn: string;
  aliases: string[];
}> = [
  {
    code: "RICE",
    nameMr: "भात",
    nameEn: "Rice / Paddy",
    aliases: ["भात", "rice", "paddy", "भात (rice / paddy)", "rice (a)", "rice (b)", "rice / paddy", "rice/paddy", "भात (rice", "rice paddy"],
  },
  {
    code: "SOYBEAN",
    nameMr: "सोयाबीन",
    nameEn: "Soybean",
    aliases: ["सोयाबीन", "soybean", "soya", "सोयाबीन (soybean)", "soybean (a)", "soybean (b)"],
  },
  {
    code: "MAIZE",
    nameMr: "मका",
    nameEn: "Maize",
    aliases: ["मका", "maize", "corn", "मका (maize)"],
  },
  {
    code: "CHANA",
    nameMr: "हरभरा",
    nameEn: "Chana",
    aliases: ["हरभरा", "chana", "चना", "हरभरा (chana)"],
  },
  {
    code: "TOOR",
    nameMr: "तूर",
    nameEn: "Toor",
    aliases: ["तूर", "toor", "tur", "arhar", "तूर (toor)"],
  },
  {
    code: "CASHEW",
    nameMr: "काजू",
    nameEn: "Cashew",
    aliases: ["काजू", "cashew", "cashew raw nuts", "काजू (cashew)", "काजू (cashew raw nuts)"],
  },
  {
    code: "NACHANI",
    nameMr: "नाचणी",
    nameEn: "Finger Millet",
    aliases: ["नाचणी", "nachani", "finger millet", "नाचणी (finger millet)", "finger millet (finger millet)"],
  },
  {
    code: "GROUNDNUT",
    nameMr: "शेंगदाणे",
    nameEn: "Groundnut",
    aliases: ["शेंगदाणे", "groundnut", "shenga", "peanut", "शेंगदाणे (groundnut)"],
  },
  {
    code: "JOWAR",
    nameMr: "ज्वारी",
    nameEn: "Jowar",
    aliases: ["ज्वारी", "jowar", "sorghum", "ज्वारी (jowar)"],
  },
  {
    code: "WHEAT",
    nameMr: "गहू",
    nameEn: "Wheat",
    aliases: ["गहू", "wheat", "गहू (wheat)"],
  },
];

/**
 * Normalizes any crop/product name string into a standard commodity identity
 */
export function normalizeCommodity(rawName: string): {
  code: string;
  nameMr: string;
  nameEn: string;
  key: string;
} {
  const clean = (rawName || "").trim().toLowerCase();
  for (const c of KNOWN_COMMODITIES) {
    if (clean === c.code.toLowerCase()) {
      return { code: c.code, nameMr: c.nameMr, nameEn: c.nameEn, key: c.code };
    }
    if (c.aliases.some((a) => clean.includes(a) || a.includes(clean))) {
      return { code: c.code, nameMr: c.nameMr, nameEn: c.nameEn, key: c.code };
    }
  }

  // Custom or "Other" commodity
  const title = (rawName || "").trim() || "इतर (Other)";
  return {
    code: "OTHER_" + title.toUpperCase().replace(/\s+/g, "_"),
    nameMr: title,
    nameEn: title,
    key: "OTHER_" + title.toLowerCase(),
  };
}

export interface RawBillItem {
  billId: string;
  productName: string;
  grade?: string | null;
  netKg: string | number;
  ratePerKg: string | number;
  totalAmount?: string | number;
}

export interface RawBill {
  id: string;
  kind: "purchase" | "sale";
  billNo: string;
  billDate: string;
  partyName: string;
  deletedAt?: Date | string | null;
}

export interface RawAdjustment {
  id: string;
  product: string;
  date: string;
  kgChange: string | number;
  reason: "wastage" | "moisture_loss" | "correction" | "opening_stock";
  note?: string | null;
  deletedAt?: Date | string | null;
}

/**
 * Single source of truth calculation for stock across all purchases, sales, and adjustments
 */
export function calculateUnifiedStock(
  billsList: RawBill[],
  itemsList: RawBillItem[],
  adjustmentsList: RawAdjustment[] = []
): {
  stockReport: CommodityStockSummary[];
  totalValuation: number;
  totalInStockKg: number;
  movements: StockMovement[];
} {
  // Map bills by ID
  const activeBillsMap = new Map<string, RawBill>();
  for (const b of billsList) {
    if (!b.deletedAt) {
      activeBillsMap.set(b.id, b);
    }
  }

  const commoditiesMap = new Map<
    string,
    {
      code: string;
      nameMr: string;
      nameEn: string;
      boughtKg: number;
      boughtCostTotal: number;
      soldKg: number;
      adjustmentKg: number;
      grades: Record<string, { boughtKg: number; soldKg: number; inStockKg: number }>;
    }
  >();

  // Initialize known commodities
  for (const c of KNOWN_COMMODITIES) {
    commoditiesMap.set(c.code, {
      code: c.code,
      nameMr: c.nameMr,
      nameEn: c.nameEn,
      boughtKg: 0,
      boughtCostTotal: 0,
      soldKg: 0,
      adjustmentKg: 0,
      grades: {},
    });
  }

  const movements: StockMovement[] = [];

  // Process Bill Items
  for (const item of itemsList) {
    const parentBill = activeBillsMap.get(item.billId);
    if (!parentBill) continue; // Exclude deleted bills

    const norm = normalizeCommodity(item.productName);
    let entry = commoditiesMap.get(norm.key) || commoditiesMap.get(norm.code);
    if (!entry) {
      entry = {
        code: norm.code,
        nameMr: norm.nameMr,
        nameEn: norm.nameEn,
        boughtKg: 0,
        boughtCostTotal: 0,
        soldKg: 0,
        adjustmentKg: 0,
        grades: {},
      };
      commoditiesMap.set(norm.key, entry);
    }

    const netKg = Number(item.netKg) || 0;
    const rate = Number(item.ratePerKg) || 0;
    const gradeKey = (item.grade || "").trim() || "General";

    if (!entry.grades[gradeKey]) {
      entry.grades[gradeKey] = { boughtKg: 0, soldKg: 0, inStockKg: 0 };
    }

    if (parentBill.kind === "purchase") {
      entry.boughtKg += netKg;
      entry.boughtCostTotal += netKg * rate;
      entry.grades[gradeKey].boughtKg += netKg;

      movements.push({
        id: item.billId + "-" + (item.productName || ""),
        date: parentBill.billDate,
        type: "purchase",
        referenceNo: parentBill.billNo,
        partyName: parentBill.partyName,
        product: `${entry.nameMr} (${entry.nameEn})${item.grade ? ` [${item.grade}]` : ""}`,
        inKg: netKg,
        outKg: 0,
        ratePerKg: rate,
      });
    } else if (parentBill.kind === "sale") {
      entry.soldKg += netKg;
      entry.grades[gradeKey].soldKg += netKg;

      movements.push({
        id: item.billId + "-" + (item.productName || ""),
        date: parentBill.billDate,
        type: "sale",
        referenceNo: parentBill.billNo,
        partyName: parentBill.partyName,
        product: `${entry.nameMr} (${entry.nameEn})${item.grade ? ` [${item.grade}]` : ""}`,
        inKg: 0,
        outKg: netKg,
        ratePerKg: rate,
      });
    }
  }

  // Process Stock Adjustments
  for (const adj of adjustmentsList) {
    if (adj.deletedAt) continue;

    const norm = normalizeCommodity(adj.product);
    let entry = commoditiesMap.get(norm.key) || commoditiesMap.get(norm.code);
    if (!entry) {
      entry = {
        code: norm.code,
        nameMr: norm.nameMr,
        nameEn: norm.nameEn,
        boughtKg: 0,
        boughtCostTotal: 0,
        soldKg: 0,
        adjustmentKg: 0,
        grades: {},
      };
      commoditiesMap.set(norm.key, entry);
    }

    const change = Number(adj.kgChange) || 0;
    entry.adjustmentKg += change;

    movements.push({
      id: adj.id,
      date: adj.date,
      type: "adjustment",
      referenceNo: `ADJ-${adj.reason.toUpperCase()}`,
      partyName: "स्टॉक दुरुस्ती (Stock Adjustment)",
      product: `${entry.nameMr} (${entry.nameEn})`,
      inKg: change > 0 ? change : 0,
      outKg: change < 0 ? Math.abs(change) : 0,
      ratePerKg: 0,
      reason: adj.reason,
      note: adj.note || undefined,
    });
  }

  // Sort movements chronologically ascending (oldest first) for running balance
  movements.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  // Compute per-commodity running balance (chronological)
  const runningMap = new Map<string, number>();
  for (const m of movements) {
    // Extract commodity code from product string (use commodity code key)
    const norm = normalizeCommodity(m.product.split(" (")[0]);
    const ck = norm.code;
    const prev = runningMap.get(ck) ?? 0;
    const bal = Math.round((prev + m.inKg - m.outKg) * 1000) / 1000;
    runningMap.set(ck, bal);
    m.runningBalance = bal;
  }

  // Reverse to show newest first in the UI
  movements.reverse();

  // Compute final summary
  const stockReport: CommodityStockSummary[] = [];
  let totalValuation = 0;
  let totalInStockKg = 0;

  for (const [key, c] of commoditiesMap.entries()) {
    const inStockKg = Math.round((c.boughtKg - c.soldKg + c.adjustmentKg) * 1000) / 1000;
    const avgBuyRate = c.boughtKg > 0 ? Math.round((c.boughtCostTotal / c.boughtKg) * 100) / 100 : 0;
    const valuation = inStockKg > 0 ? Math.round(inStockKg * avgBuyRate) : 0;

    // Per-grade in-stock
    for (const g of Object.keys(c.grades)) {
      c.grades[g].inStockKg = c.grades[g].boughtKg - c.grades[g].soldKg;
    }

    stockReport.push({
      key,
      code: c.code,
      nameMr: c.nameMr,
      nameEn: c.nameEn,
      boughtKg: c.boughtKg,
      soldKg: c.soldKg,
      adjustmentKg: c.adjustmentKg,
      inStockKg,
      avgBuyRate,
      valuation,
      grades: c.grades,
    });

    if (inStockKg > 0) {
      totalValuation += valuation;
      totalInStockKg += inStockKg;
    }
  }

  return {
    stockReport,
    totalValuation,
    totalInStockKg,
    movements,
  };
}

