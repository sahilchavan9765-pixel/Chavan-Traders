import { formatIndianCurrency, formatDateDDMMYYYY } from "./calculations";

export interface LedgerEntry {
  id: string;
  date: string;
  dateFormatted: string;
  docType: "bill" | "payment" | "advance";
  docNo: string;
  description: string;
  debit: number;   // Amount paid out (or goods sold to client)
  credit: number;  // Amount received (or goods bought from farmer)
  runningBalance: number;
}

export interface PartyLedgerResult {
  partyId: string;
  partyName: string;
  partyType: "farmer" | "client" | "both";
  totalBilled: number;
  totalPaid: number;
  advances: number;
  balance: number; // For farmer: > 0 = We owe farmer (देणे बाकी), < 0 = Farmer has advance (ॲडव्हान्स). For client: > 0 = Client owes us (येणे), < 0 = Client advance.
  isAdvance: boolean;
  entries: LedgerEntry[];
}

export interface BillFifoAllocation {
  billId: string;
  billNo: string;
  billDate: string;
  netPayable: number;
  initialPaid: number;
  allocatedFromPayments: number;
  totalPaid: number;
  remainingDue: number;
  isPaid: boolean;
}

/**
 * Allocates party payments to open bills using FIFO (First In, First Out).
 * This ensures bill status pills and remaining dues accurately reflect standalone payments.
 */
export function calculateFifoAllocations(
  billsList: Array<{
    id: string;
    billNo: string;
    billDate: string;
    createdAt?: Date | string;
    hamali?: string | number;
    paidNow?: string | number;
    itemsTotal: number;
  }>,
  standalonePaymentsList: Array<{
    id: string;
    amount: string | number;
    kind: "payment" | "advance";
    paymentDate: string;
    createdAt?: Date | string;
  }>
): Map<string, BillFifoAllocation> {
  // Sort bills oldest to newest
  const sortedBills = [...billsList].sort((a, b) => {
    const dComp = (a.billDate || "").localeCompare(b.billDate || "");
    if (dComp !== 0) return dComp;
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tA - tB;
  });

  // Total standalone payments/advances to distribute
  let unallocatedPool = standalonePaymentsList.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const resultMap = new Map<string, BillFifoAllocation>();

  for (const bill of sortedBills) {
    const hamali = Number(bill.hamali || 0);
    const netPayable = Math.max(0, bill.itemsTotal - hamali);
    const initialPaid = Math.min(netPayable, Number(bill.paidNow || 0));
    const openAfterInitial = Math.max(0, netPayable - initialPaid);

    let allocatedFromPayments = 0;
    if (unallocatedPool > 0 && openAfterInitial > 0) {
      allocatedFromPayments = Math.min(unallocatedPool, openAfterInitial);
      unallocatedPool -= allocatedFromPayments;
    }

    const totalPaid = initialPaid + allocatedFromPayments;
    const remainingDue = Math.max(0, netPayable - totalPaid);
    const isPaid = remainingDue <= 0.01;

    resultMap.set(bill.id, {
      billId: bill.id,
      billNo: bill.billNo,
      billDate: bill.billDate,
      netPayable,
      initialPaid,
      allocatedFromPayments,
      totalPaid,
      remainingDue,
      isPaid,
    });
  }

  return resultMap;
}

/**
 * Builds an itemized party ledger statement with running balance
 */
export function buildPartyLedger(
  party: { id: string; name: string; type: string },
  partyBills: Array<{
    id: string;
    kind: string;
    billNo: string;
    billDate: string;
    hamali?: string | number;
    paidNow?: string | number;
    netTotal: number;
    createdAt?: Date | string;
  }>,
  partyPayments: Array<{
    id: string;
    kind: "payment" | "advance";
    amount: string | number;
    paymentDate: string;
    mode?: string;
    note?: string;
    billId?: string | null;
    createdAt?: Date | string;
  }>
): PartyLedgerResult {
  const isFarmer = party.type === "farmer" || party.type === "both";

  interface RawItem {
    id: string;
    date: string;
    createdAt: number;
    docType: "bill" | "payment" | "advance";
    docNo: string;
    description: string;
    amount: number;
    initialPaid: number;
  }

  const rawItems: RawItem[] = [];

  for (const b of partyBills) {
    const initialPaid = Number(b.paidNow || 0);
    rawItems.push({
      id: b.id,
      date: b.billDate,
      createdAt: new Date(b.createdAt || 0).getTime(),
      docType: "bill",
      docNo: b.billNo,
      description: `${b.kind === "purchase" ? "खरेदी बिल" : "विक्री बिल"} [${b.billNo}]`,
      amount: b.netTotal,
      initialPaid,
    });

    // If bill had paidNow entered, record it as linked payment event if not already in standalone payments
    if (initialPaid > 0 && !partyPayments.some((p) => p.billId === b.id)) {
      rawItems.push({
        id: `${b.id}-paid`,
        date: b.billDate,
        createdAt: new Date(b.createdAt || 0).getTime() + 1,
        docType: "payment",
        docNo: `${b.billNo}-P`,
        description: `बिल ${b.billNo} वेळी दिलेली रक्कम (Paid with Bill)`,
        amount: initialPaid,
        initialPaid: 0,
      });
    }
  }

  for (const p of partyPayments) {
    const isAdv = p.kind === "advance";
    rawItems.push({
      id: p.id,
      date: p.paymentDate,
      createdAt: new Date(p.createdAt || 0).getTime(),
      docType: isAdv ? "advance" : "payment",
      docNo: p.billId ? "Linked" : "Direct",
      description: isAdv
        ? `आगाऊ रक्कम (Advance) - ${p.mode || "cash"}${p.note ? ` (${p.note})` : ""}`
        : `पेमेंट (Payment) - ${p.mode || "cash"}${p.note ? ` (${p.note})` : ""}`,
      amount: Number(p.amount) || 0,
      initialPaid: 0,
    });
  }

  // Sort chronological
  rawItems.sort((a, b) => {
    const dComp = a.date.localeCompare(b.date);
    if (dComp !== 0) return dComp;
    return a.createdAt - b.createdAt;
  });

  let runningBalance = 0;
  let totalBilled = 0;
  let totalPaid = 0;
  let advances = 0;

  const entries: LedgerEntry[] = [];

  for (const item of rawItems) {
    let debit = 0;
    let credit = 0;

    if (item.docType === "bill") {
      totalBilled += item.amount;
      if (isFarmer) {
        credit = item.amount;
        runningBalance += credit;
      } else {
        debit = item.amount;
        runningBalance += debit;
      }
    } else {
      if (item.docType === "advance") {
        advances += item.amount;
      }
      totalPaid += item.amount;

      if (isFarmer) {
        debit = item.amount;
        runningBalance -= debit;
      } else {
        credit = item.amount;
        runningBalance -= credit;
      }
    }

    entries.push({
      id: item.id,
      date: item.date,
      dateFormatted: formatDateDDMMYYYY(item.date),
      docType: item.docType,
      docNo: item.docNo,
      description: item.description,
      debit,
      credit,
      runningBalance: Math.round(runningBalance * 100) / 100,
    });
  }

  // For farmer:
  // Positive balance = We owe the farmer
  // Negative balance = Farmer has advance from us
  const balance = Math.round(runningBalance * 100) / 100;
  const isAdvance = balance < 0;

  return {
    partyId: party.id,
    partyName: party.name,
    partyType: party.type as any,
    totalBilled: Math.round(totalBilled * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    advances: Math.round(advances * 100) / 100,
    balance: Math.abs(balance),
    isAdvance,
    entries,
  };
}

