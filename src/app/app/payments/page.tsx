"use client";

import { useState, useEffect, useTransition } from "react";
import {
  createPaymentAction,
  getPaymentsAction,
  deletePaymentAction,
  restorePaymentAction,
  getPartyLedgerAction,
} from "@/app/actions/payments.actions";
import {
  getPartiesAction,
} from "@/app/actions/bills.actions";
import { formatIndianCurrency, formatDateDDMMYYYY } from "@/lib/calculations";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import { DatePicker } from "@/components/ui/DatePicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Receipt,
  Plus,
  Trash2,
  Share2,
  Search,
  RotateCcw,
  BookOpen,
  X,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function PaymentsPage() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const { user, isAdmin } = useUser();
  const { lang } = useLanguage();
  const isMr = lang === "mr";

  // Form State
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [partyName, setPartyName] = useState("");
  const [partyType, setPartyType] = useState<"farmer" | "client">("farmer");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"payment" | "advance">("payment");
  const [mode, setMode] = useState<"cash" | "upi" | "bank" | "cheque">("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [handledBy, setHandledBy] = useState("");
  const [note, setNote] = useState("");
  const [selectedBillId, setSelectedBillId] = useState("");

  // Lists & Filtering
  const [existingParties, setExistingParties] = useState<any[]>([]);
  const [partySuggestions, setPartySuggestions] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [filterDirection, setFilterDirection] = useState<"ALL" | "IN" | "OUT">("ALL");

  // Delete & Restore Dialogs
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; amount: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Party Ledger Modal
  const [activeLedger, setActiveLedger] = useState<any | null>(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  useEffect(() => {
    if (!activeLedger) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveLedger(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLedger]);

  const loadData = async () => {
    try {
      const [parties, pList] = await Promise.all([
        getPartiesAction(),
        getPaymentsAction(undefined, showDeleted && isAdmin),
      ]);
      setExistingParties(parties);
      setPaymentsList(pList);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, [showDeleted, isAdmin]);

  const handlePartyNameChange = (val: string) => {
    setPartyName(val);
    if (!val.trim()) { setPartySuggestions([]); return; }
    setPartySuggestions(existingParties.filter(p => p.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5));
  };

  const handleSelectParty = (p: any) => {
    setPartyName(p.name);
    setPartyType(p.type === "client" ? "client" : "farmer");
    setPartySuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!partyName.trim()) { setErrorMsg(isMr ? "पार्टीचे नाव आवश्यक आहे." : "Party name is required."); return; }
    if (!amount || Number(amount) <= 0) { setErrorMsg(isMr ? "वैध रक्कम प्रविष्ट करा." : "Enter a valid amount."); return; }

    startTransition(async () => {
      try {
        const result = await createPaymentAction({
          partyName, partyType, paymentDate,
          amount: Number(amount), kind, mode,
          referenceNo: referenceNo || undefined,
          handledBy: handledBy || undefined,
          note,
          billId: selectedBillId || undefined,
        });
        toast.success(
          isMr ? `नोंद यशस्वी! (${result.voucherNo})` : `Entry saved! (${result.voucherNo})`,
          `₹${Number(amount).toLocaleString("en-IN")} — ${partyName}`
        );
        setAmount(""); setNote(""); setReferenceNo(""); setHandledBy(""); setSelectedBillId("");
        loadData();
      } catch (err: any) {
        setErrorMsg(err.message || (isMr ? "नोंद सेव्ह करताना त्रुटी." : "Error saving entry."));
      }
    });
  };

  const handleConfirmDelete = async (reason?: string) => {
    if (!deleteTarget) return;
    setActionInProgress(true);
    try {
      await deletePaymentAction(deleteTarget.id, reason);
      toast.success(isMr ? "नोंद हटवली गेली." : "Entry deleted.");
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(isMr ? "नोंद हटवता आली नाही." : "Could not delete.", err.message);
    } finally { setActionInProgress(false); }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setActionInProgress(true);
    try {
      await restorePaymentAction(restoreTarget.id);
      toast.success(isMr ? "नोंद पूर्ववत केली!" : "Entry restored!");
      setRestoreTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(isMr ? "पूर्ववत करता आले नाही." : "Could not restore.", err.message);
    } finally { setActionInProgress(false); }
  };

  const handleOpenLedger = async (partyNameStr: string) => {
    setIsLoadingLedger(true);
    try {
      const ledger = await getPartyLedgerAction(partyNameStr);
      setActiveLedger(ledger);
    } catch (err: any) {
      toast.error(isMr ? "खातावही लोड करता आली नाही." : "Could not load ledger.", err.message);
    } finally { setIsLoadingLedger(false); }
  };

  const handleWhatsAppReceipt = (p: any) => {
    const dirLabel = p.direction === "OUT" ? "दिले (शेतकऱ्यास)" : "मिळाले (ग्राहकाकडून)";
    const modeLabel = p.mode === "cash" ? "रोख" : p.mode === "upi" ? "UPI" : p.mode === "bank" ? "बँक" : "चेक";
    const text =
      `*चव्हाण ट्रेडर्स — पावती (${p.voucherNo || ""})*\n` +
      `कै. श्री. रमेश कृष्णा चव्हाण, उत्तूर\n` +
      `────────────────────\n` +
      `नाव: *${p.partyName}*\n` +
      `दिनांक: ${formatDateDDMMYYYY(p.paymentDate)}\n` +
      `व्यवहार: *${dirLabel}*\n` +
      `रक्कम: *₹${Number(p.amount).toLocaleString("en-IN")}*\n` +
      `माध्यम: ${modeLabel}${p.referenceNo ? ` (${p.referenceNo})` : ""}\n` +
      (p.allocations?.length > 0 ? `बिले: ${p.allocations.map((a: any) => `${a.billNo} ₹${Number(a.amount).toLocaleString("en-IN")}`).join(", ")}\n` : "") +
      (p.note ? `टीप: ${p.note}\n` : "") +
      `────────────────────\n📞 9765941078 / 9850815527`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Filtered & footer totals
  const filtered = paymentsList.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchQ = !q || p.partyName.toLowerCase().includes(q) ||
      (p.voucherNo || "").toLowerCase().includes(q) ||
      (p.note || "").toLowerCase().includes(q) ||
      (p.allocations || []).some((a: any) => (a.billNo || "").toLowerCase().includes(q));
    const matchDir = filterDirection === "ALL" || p.direction === filterDirection;
    return matchQ && matchDir;
  });

  const totalOut = filtered.filter(p => !p.isDeleted && p.direction === "OUT").reduce((s, p) => s + Number(p.amount), 0);
  const totalIn = filtered.filter(p => !p.isDeleted && p.direction === "IN").reduce((s, p) => s + Number(p.amount), 0);
  const totalCash = filtered.filter(p => !p.isDeleted && p.mode === "cash").reduce((s, p) => s + Number(p.amount), 0);
  const totalUpi = filtered.filter(p => !p.isDeleted && p.mode === "upi").reduce((s, p) => s + Number(p.amount), 0);

  const t = {
    title: isMr ? "जमा-खर्च वही" : "Money Ledger",
    subtitle: isMr ? "शेतकऱ्यांना दिलेले पैसे, ग्राहकांकडून मिळालेली रक्कम, आगाऊ व पावत्या." : "Payments made to farmers, received from clients, advances and receipts.",
    newEntry: isMr ? "नवीन नोंद" : "New Entry",
    date: isMr ? "तारीख" : "Date",
    partyName: isMr ? "पार्टीचे नाव *" : "Party Name *",
    partyType: isMr ? "व्यक्ती प्रकार" : "Party Type",
    farmer: isMr ? "शेतकरी" : "Farmer",
    client: isMr ? "ग्राहक / व्यापारी" : "Client",
    entryKind: isMr ? "नोंद प्रकार" : "Entry Kind",
    payment: isMr ? "पेमेंट" : "Payment",
    advance: isMr ? "आगाऊ (ॲडव्हान्स)" : "Advance",
    amount: isMr ? "रक्कम ₹ *" : "Amount ₹ *",
    mode: isMr ? "माध्यम" : "Mode",
    cash: isMr ? "रोख" : "Cash",
    bank: isMr ? "बँक ट्रान्सफर" : "Bank Transfer",
    cheque: isMr ? "चेक" : "Cheque",
    refNo: isMr ? "संदर्भ क्र. / UPI ID" : "Reference No / UPI ID",
    handledBy: isMr ? "पैसे कोणी दिले / घेतले" : "Handled by",
    note: isMr ? "टीप (वैकल्पिक)" : "Note (optional)",
    save: isMr ? "नोंद सेव्ह करा" : "Save Entry",
    saving: isMr ? "सेव्ह होत आहे..." : "Saving...",
    register: isMr ? "पावती-वाहन वही (Payment Register)" : "Payment Register",
    search: isMr ? "नाव, व्हाउचर, बिल शोधा..." : "Search name, voucher, bill...",
    colDate: isMr ? "तारीख" : "Date",
    colVoucher: isMr ? "व्हाउचर" : "Voucher",
    colParty: isMr ? "नाव / पार्टी" : "Party",
    colDirection: isMr ? "दिशा" : "Direction",
    colBills: isMr ? "बिले" : "Applied Bills",
    colMode: isMr ? "माध्यम" : "Mode",
    colAmount: isMr ? "रक्कम" : "Amount",
    colNote: isMr ? "टीप" : "Note",
    colActions: isMr ? "कृती" : "Actions",
    noEntries: isMr ? "कोणत्याही नोंदी आढळल्या नाहीत." : "No entries found.",
    dirOut: isMr ? "दिले, शेतकऱ्यास" : "Paid to Farmer",
    dirIn: isMr ? "मिळाले, ग्राहकाकडून" : "Received from Client",
    totalPaidOut: isMr ? "एकूण दिले" : "Total Paid Out",
    totalReceived: isMr ? "एकूण मिळाले" : "Total Received",
    net: isMr ? "निव्वळ (Net)" : "Net",
    byCash: isMr ? "रोख" : "Cash",
    byUpi: "UPI",
    showDeleted: isMr ? "रद्द केलेल्या नोंदी दाखवा" : "Show deleted entries",
    all: isMr ? "सर्व" : "All",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Dialogs */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        titleMr="ही पेमेंट नोंद हटवायची आहे का?"
        titleEn="Delete this payment entry?"
        messageMr={`${deleteTarget?.name} यांची ₹${deleteTarget?.amount} ची नोंद रद्द केली जाईल. ॲडमिन पूर्ववत करू शकतो.`}
        messageEn="This payment will be soft-deleted and can be restored by admin."
        confirmLabelMr="नोंद हटवा" confirmLabelEn="Delete Entry"
        requireReason isDestructive isPending={actionInProgress}
        onConfirm={handleConfirmDelete} onClose={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={!!restoreTarget}
        titleMr="नोंद पूर्ववत करायची आहे का?" titleEn="Restore this payment entry?"
        messageMr="नोंद पूर्ववत केल्यास ती पुन्हा वहीत व खात्यात दिसेल."
        messageEn="Restored entry will appear in the register and party balance."
        confirmLabelMr="पूर्ववत करा" confirmLabelEn="Restore"
        requireReason={false} isDestructive={false} isPending={actionInProgress}
        onConfirm={handleConfirmRestore} onClose={() => setRestoreTarget(null)}
      />

      {/* Party Ledger Modal */}
      {activeLedger && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setActiveLedger(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/50">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">{activeLedger.partyName}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{isMr ? "तपशीलवार खातेवही — चालू शिल्लक" : "Itemized ledger with running balance"}</p>
              </div>
              <button onClick={() => setActiveLedger(null)} className="p-2 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            {/* Balance summary */}
            <div className="px-6 py-3 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 flex flex-wrap gap-6 text-xs">
              <div>
                <span className="text-stone-500 block">{isMr ? "चालू शिल्लक:" : "Current Balance:"}</span>
                <span className={`font-mono font-bold text-base ${activeLedger.finalBalance > 0 ? "text-red-600" : activeLedger.finalBalance < 0 ? "text-[#1f4d33] dark:text-emerald-400" : "text-stone-500"}`}>
                  {formatIndianCurrency(Math.abs(activeLedger.finalBalance))}
                  {activeLedger.finalBalance > 0 ? (isMr ? " (बाकी)" : " Due") : activeLedger.finalBalance < 0 ? (isMr ? " (ॲडव्हान्स)" : " Advance") : ""}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                  <tr className="text-stone-500">
                    <th className="py-2.5 px-4 font-semibold">{isMr ? "तारीख" : "Date"}</th>
                    <th className="py-2.5 px-4 font-semibold">{isMr ? "तपशील" : "Details"}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">{isMr ? "नावे ₹" : "Debit ₹"}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">{isMr ? "जमा ₹" : "Credit ₹"}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">{isMr ? "शिल्लक ₹" : "Balance ₹"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {(activeLedger.entries || []).length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-stone-400">{isMr ? "कोणतेही व्यवहार नाहीत." : "No transactions."}</td></tr>
                  ) : (activeLedger.entries || []).map((en: any, i: number) => (
                    <tr key={i} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30">
                      <td className="py-2.5 px-4 font-mono text-stone-500 whitespace-nowrap">{formatDateDDMMYYYY(en.date)}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{en.description}</span>
                        <span className="ml-2 text-stone-400">{en.ref}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-stone-700 dark:text-stone-300">
                        {en.debit > 0 ? formatIndianCurrency(en.debit) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#1f4d33] dark:text-emerald-400">
                        {en.credit > 0 ? formatIndianCurrency(en.credit) : "—"}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono tabular-nums font-bold ${(en.balance || 0) > 0 ? "text-red-600" : (en.balance || 0) < 0 ? "text-[#1f4d33]" : "text-stone-500"}`}>
                        {formatIndianCurrency(Math.abs(en.balance || 0))}
                        {(en.balance || 0) > 0 ? " Dr" : (en.balance || 0) < 0 ? " Cr" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
              <button onClick={() => setActiveLedger(null)} className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold hover:bg-stone-300 cursor-pointer">
                {isMr ? "बंद करा" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#8b1a2b] dark:text-[#f8ecc4] flex items-center gap-2.5">
            <Receipt className="w-7 h-7" />
            <span>{t.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">{t.subtitle}</p>
        </div>
        {isAdmin && (
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors w-fit">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded text-[#8b1a2b] focus:ring-[#8b1a2b]" />
            <span>{t.showDeleted}</span>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* New Entry Form */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm h-fit">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <Plus className="w-4 h-4 text-[#8b1a2b]" />
              <span>{t.newEntry}</span>
            </h3>

            {errorMsg && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">{errorMsg}</div>}

            <DatePicker label={t.date} value={paymentDate} onChange={setPaymentDate} />

            {/* Party Name with autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{t.partyName}</label>
              <input type="text" placeholder={isMr ? "उदा. आनंदराव पाटील" : "e.g. Anand Patil"} value={partyName}
                onChange={e => handlePartyNameChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm focus:ring-2 focus:ring-[#8b1a2b] focus:border-transparent outline-none" required />
              {partySuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-lg overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                  {partySuggestions.map(p => (
                    <button key={p.id} type="button" onClick={() => handleSelectParty(p)}
                      className="w-full text-left px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs flex justify-between cursor-pointer">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-stone-400">{p.type === "farmer" ? (isMr ? "शेतकरी" : "Farmer") : (isMr ? "ग्राहक" : "Client")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{t.partyType}</label>
                <select value={partyType} onChange={e => setPartyType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs">
                  <option value="farmer">{t.farmer}</option>
                  <option value="client">{t.client}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{t.entryKind}</label>
                <select value={kind} onChange={e => setKind(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold">
                  <option value="payment">{t.payment}</option>
                  <option value="advance">{t.advance}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{t.amount}</label>
                <input type="number" inputMode="decimal" placeholder="5000" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm font-mono font-bold focus:ring-2 focus:ring-[#8b1a2b] outline-none" required min="1" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{t.mode}</label>
                <select value={mode} onChange={e => setMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs">
                  <option value="cash">{t.cash}</option>
                  <option value="upi">UPI / PhonePe / GPay</option>
                  <option value="bank">{t.bank}</option>
                  <option value="cheque">{t.cheque}</option>
                </select>
              </div>
            </div>

            {(mode === "upi" || mode === "bank" || mode === "cheque") && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{t.refNo}</label>
                <input type="text" placeholder={mode === "upi" ? "UPI Transaction ID" : mode === "cheque" ? (isMr ? "चेक क्रमांक" : "Cheque No.") : (isMr ? "NEFT/IMPS संदर्भ" : "NEFT/IMPS Ref")}
                  value={referenceNo} onChange={e => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-xs font-mono focus:ring-2 focus:ring-[#8b1a2b] outline-none" />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{t.handledBy}</label>
              <input type="text" placeholder={isMr ? "उदा. साहिल चव्हाण, ड्रायव्हर..." : "e.g. Sahil Chavan, driver..."}
                value={handledBy} onChange={e => setHandledBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-xs focus:ring-2 focus:ring-[#8b1a2b] outline-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{t.note}</label>
              <input type="text" placeholder={isMr ? "उदा. माल उतरण्यापूर्वी दिले" : "e.g. Paid before unloading"} value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-xs focus:ring-2 focus:ring-[#8b1a2b] outline-none" />
            </div>

            <button type="submit" disabled={isPending}
              className="w-full py-3 rounded-xl bg-[#8b1a2b] text-white font-bold text-sm shadow hover:bg-[#6d1320] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isPending ? t.saving : t.save}</span>
            </button>
          </form>
        </div>

        {/* Payment Register */}
        <div className="lg:col-span-2 space-y-4">
          {/* Footer Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t.totalPaidOut, value: totalOut, color: "text-[#8b1a2b]" },
              { label: t.totalReceived, value: totalIn, color: "text-[#1f4d33]" },
              { label: t.byCash, value: totalCash, color: "text-stone-700 dark:text-stone-300" },
              { label: t.byUpi, value: totalUpi, color: "text-blue-600 dark:text-blue-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 shadow-sm">
                <div className="text-[11px] text-stone-500 font-medium">{label}</div>
                <div className={`font-mono font-bold text-base tabular-nums ${color}`}>{formatIndianCurrency(value)}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Register Header */}
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#8b1a2b]" />
                <span>{t.register}</span>
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Direction Filter */}
                <div className="flex rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden text-xs">
                  {(["ALL", "OUT", "IN"] as const).map(dir => (
                    <button key={dir} onClick={() => setFilterDirection(dir)}
                      className={`px-3 py-1.5 font-semibold transition-colors cursor-pointer ${filterDirection === dir ? (dir === "OUT" ? "bg-[#8b1a2b] text-white" : dir === "IN" ? "bg-[#1f4d33] text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300") : "text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800"}`}>
                      {dir === "ALL" ? t.all : dir === "OUT" ? (isMr ? "दिले" : "Paid Out") : (isMr ? "मिळाले" : "Received")}
                    </button>
                  ))}
                </div>
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input type="text" placeholder={t.search} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent focus:ring-2 focus:ring-[#8b1a2b] outline-none w-44" />
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
                  <tr className="text-stone-500 font-semibold">
                    <th className="py-2.5 px-4 whitespace-nowrap">{t.colDate}</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">{t.colVoucher}</th>
                    <th className="py-2.5 px-3">{t.colParty}</th>
                    <th className="py-2.5 px-3">{t.colDirection}</th>
                    <th className="py-2.5 px-3">{t.colBills}</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">{t.colMode}</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">{t.colAmount}</th>
                    <th className="py-2.5 px-3 max-w-[8rem]">{t.colNote}</th>
                    <th className="py-2.5 px-3 text-center">{t.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="py-10 text-center text-stone-400">{t.noEntries}</td></tr>
                  ) : filtered.map(p => {
                    const isDeleted = !!p.isDeleted;
                    const isOut = p.direction === "OUT";
                    return (
                      <tr key={p.id} className={`hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors ${isDeleted ? "bg-red-50/30 dark:bg-red-950/20 opacity-60" : ""}`}>
                        <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">{formatDateDDMMYYYY(p.paymentDate)}</td>
                        <td className="py-3 px-3 font-mono text-xs whitespace-nowrap">
                          <span className={`font-bold ${isOut ? "text-[#8b1a2b]" : "text-[#1f4d33]"}`}>{p.voucherNo || "—"}</span>
                        </td>
                        <td className="py-3 px-3 max-w-[10rem]">
                          <button type="button" onClick={() => handleOpenLedger(p.partyName)}
                            className="hover:underline hover:text-[#8b1a2b] text-left cursor-pointer inline-flex items-center gap-1 group">
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate max-w-[7rem] block">{p.partyName}</span>
                            <BookOpen className="w-3 h-3 text-stone-400 group-hover:text-[#8b1a2b] shrink-0" />
                          </button>
                          {p.handledBy && <div className="text-[11px] text-stone-400 truncate max-w-[7rem]">{p.handledBy}</div>}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${isOut ? "bg-[#8b1a2b]/10 text-[#8b1a2b]" : "bg-[#1f4d33]/10 text-[#1f4d33] dark:text-emerald-400"}`}>
                            {isOut ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            {isOut ? (isMr ? "दिले" : "Out") : (isMr ? "मिळाले" : "In")}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.allocations || []).length > 0 ? (p.allocations || []).map((a: any) => (
                              <Link key={a.id} href={`/app/invoice/${a.billId}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[#8b1a2b] dark:text-[#f8ecc4] font-mono text-[11px] font-bold hover:bg-stone-200 dark:hover:bg-stone-700 whitespace-nowrap transition-colors">
                                <FileText className="w-2.5 h-2.5" />
                                {a.billNo} · ₹{Number(a.amount).toLocaleString("en-IN")}
                              </Link>
                            )) : (
                              <span className="text-stone-400 text-[11px]">{p.kind === "advance" ? (isMr ? "आगाऊ" : "Advance") : "—"}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-[11px] font-mono uppercase text-stone-600 dark:text-stone-400">{p.mode}</span>
                          {p.referenceNo && <div className="text-[10px] text-stone-400 font-mono truncate max-w-[6rem]">{p.referenceNo}</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-stone-900 dark:text-stone-100">
                          {formatIndianCurrency(Number(p.amount))}
                        </td>
                        <td className="py-3 px-3 max-w-[8rem]">
                          <span className="text-stone-500 text-[11px] line-clamp-2">{p.note || "—"}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleWhatsAppReceipt(p)} title={isMr ? "WhatsApp पावती" : "WhatsApp Receipt"}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors cursor-pointer">
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            {isDeleted && isAdmin && (
                              <button onClick={() => setRestoreTarget({ id: p.id, name: p.partyName })} title={isMr ? "पूर्ववत करा" : "Restore"}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!isDeleted && isAdmin && (
                              <button onClick={() => setDeleteTarget({ id: p.id, name: p.partyName, amount: Number(p.amount).toLocaleString("en-IN") })} title={isMr ? "नोंद हटवा" : "Delete"}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-stone-100 dark:divide-stone-800">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-stone-400 text-sm">{t.noEntries}</div>
              ) : filtered.map(p => {
                const isDeleted = !!p.isDeleted;
                const isOut = p.direction === "OUT";
                return (
                  <div key={p.id} className={`p-4 space-y-2 ${isDeleted ? "opacity-60 bg-red-50/30 dark:bg-red-950/20" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button type="button" onClick={() => handleOpenLedger(p.partyName)}
                          className="font-semibold text-sm text-stone-900 dark:text-stone-100 hover:text-[#8b1a2b] cursor-pointer text-left">
                          {p.partyName}
                        </button>
                        {p.handledBy && <div className="text-xs text-stone-400">{p.handledBy}</div>}
                      </div>
                      <span className="font-mono font-bold tabular-nums text-base text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        {formatIndianCurrency(Number(p.amount))}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center text-xs">
                      <span className="font-mono text-stone-400">{formatDateDDMMYYYY(p.paymentDate)}</span>
                      {p.voucherNo && <span className={`font-mono font-bold ${isOut ? "text-[#8b1a2b]" : "text-[#1f4d33]"}`}>{p.voucherNo}</span>}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${isOut ? "bg-[#8b1a2b]/10 text-[#8b1a2b]" : "bg-[#1f4d33]/10 text-[#1f4d33]"}`}>
                        {isOut ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {isOut ? (isMr ? "दिले" : "Out") : (isMr ? "मिळाले" : "In")}
                      </span>
                      <span className="uppercase text-stone-500 font-mono text-[11px]">{p.mode}</span>
                    </div>
                    {(p.allocations || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(p.allocations || []).map((a: any) => (
                          <Link key={a.id} href={`/app/invoice/${a.billId}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[#8b1a2b] dark:text-[#f8ecc4] font-mono text-[11px] font-bold">
                            <FileText className="w-2.5 h-2.5" />{a.billNo} · ₹{Number(a.amount).toLocaleString("en-IN")}
                          </Link>
                        ))}
                      </div>
                    )}
                    {p.note && <div className="text-xs text-stone-500">{p.note}</div>}
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => handleWhatsAppReceipt(p)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"><Share2 className="w-3.5 h-3.5" /></button>
                      {isDeleted && isAdmin && <button onClick={() => setRestoreTarget({ id: p.id, name: p.partyName })} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /></button>}
                      {!isDeleted && isAdmin && <button onClick={() => setDeleteTarget({ id: p.id, name: p.partyName, amount: Number(p.amount).toLocaleString("en-IN") })} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
