"use client";

import { useState, useEffect, useTransition } from "react";
import {
  createBillAction,
  getBillsAction,
  getPartiesAction,
  deleteBillAction,
  restoreBillAction,
} from "@/app/actions/bills.actions";
import {
  parseBagWeights,
  calculateGrossWeight,
  calculateNetWeight,
  calculateItemTotal,
  formatIndianCurrency,
  formatWeight,
} from "@/lib/calculations";
import {
  downloadBillPdf,
  shareBillOnWhatsApp,
  formatDateDDMMYYYY,
} from "@/lib/pdf-generator";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MandiInvoicePaper } from "@/components/invoice/MandiInvoice";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Share2,
  FileText,
  Search,
  CheckCircle2,
  ArrowRight,
  Download,
  RotateCcw,
  FileSpreadsheet,
  AlertTriangle,
  Eye,
  Filter,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const COMMODITIES = [
  { code: "bhat", nameMr: "भात", nameEn: "Rice / Paddy" },
  { code: "soybean", nameMr: "सोयाबीन", nameEn: "Soybean" },
  { code: "kaju", nameMr: "काजू बी", nameEn: "Cashew Raw Nuts" },
  { code: "shenga", nameMr: "शेंगा", nameEn: "Groundnut" },
  { code: "nachani", nameMr: "नाचणी", nameEn: "Finger Millet" },
  { code: "other", nameMr: "इतर धान्ये", nameEn: "Other Produce" },
];

const OTHER_CROP_CHIPS = [
  { nameMr: "ज्वारी", nameEn: "Jowar" },
  { nameMr: "गहू", nameEn: "Wheat" },
  { nameMr: "मका", nameEn: "Maize" },
  { nameMr: "हरभरा", nameEn: "Chana" },
  { nameMr: "तूर", nameEn: "Toor" },
];

interface ProduceItemRow {
  id: string;
  cropName: string;
  customCropName: string;
  grade: string;
  bagWeightsInput: string;
  cutKg: string;
  ratePerKg: string;
}

const createNewItem = (initialCrop: string): ProduceItemRow => ({
  id: Math.random().toString(36).substring(2, 9),
  cropName: initialCrop,
  customCropName: "",
  grade: "",
  bagWeightsInput: "",
  cutKg: "0",
  ratePerKg: "",
});

export default function PurchasePage() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const { user, isAdmin } = useUser();
  const { lang } = useLanguage();
  const isMarathi = lang === "mr";

  const defaultCropName = lang === "mr" ? COMMODITIES[0].nameMr : COMMODITIES[0].nameEn;

  // Form State
  const [billDate, setBillDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyVillage, setPartyVillage] = useState("");

  // Multi-item Produce Rows
  const [items, setItems] = useState<ProduceItemRow[]>([createNewItem(defaultCropName)]);

  // Overall bill deductions
  const [hamali, setHamali] = useState("0");
  const [paidNow, setPaidNow] = useState("0");
  const [note, setNote] = useState("");

  // Server Data & Lists
  const [existingParties, setExistingParties] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [partySuggestions, setPartySuggestions] = useState<any[]>([]);
  const [createdBill, setCreatedBill] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "due" | "paid">("all");
  const [showDeleted, setShowDeleted] = useState(false);

  // Delete & Restore Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; no: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; no: string } | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Hidden Off-screen Export Bill
  const [exportingBill, setExportingBill] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      const [partiesData, billsData] = await Promise.all([
        getPartiesAction("farmer"),
        getBillsAction("purchase", showDeleted && isAdmin),
      ]);
      setExistingParties(partiesData);
      setRecentBills(billsData);
    } catch (err: any) {
      console.error("Load error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [showDeleted, isAdmin]);

  // Calculations for produce rows
  const calculatedItems = items.map((it) => {
    const isOther =
      it.cropName === "इतर धान्ये" ||
      it.cropName === "Other Produce" ||
      it.cropName.includes("इतर");
    const effectiveName = isOther && it.customCropName.trim()
      ? it.customCropName.trim()
      : it.cropName;

    const parsedBags = parseBagWeights(it.bagWeightsInput);
    const grossKg = calculateGrossWeight(parsedBags);
    const cutKg = Number(it.cutKg) || 0;
    const netKg = calculateNetWeight(grossKg, cutKg);
    const rate = Number(it.ratePerKg) || 0;
    const totalAmount = calculateItemTotal(netKg, rate);

    return {
      ...it,
      effectiveName,
      isOther,
      parsedBags,
      grossKg,
      cutKgNum: cutKg,
      netKg,
      rate,
      totalAmount,
    };
  });

  const totalBags = calculatedItems.reduce(
    (acc, it) => acc + it.parsedBags.length,
    0
  );
  const totalGrossKg = calculatedItems.reduce((acc, it) => acc + it.grossKg, 0);
  const totalCutKg = calculatedItems.reduce((acc, it) => acc + it.cutKgNum, 0);
  const totalNetKg = calculatedItems.reduce((acc, it) => acc + it.netKg, 0);
  const totalItemsAmount = calculatedItems.reduce(
    (acc, it) => acc + it.totalAmount,
    0
  );
  const hamaliNum = Number(hamali) || 0;
  const netPayable = Math.max(0, totalItemsAmount - hamaliNum);
  const paidNowNum = Number(paidNow) || 0;
  const balanceDue = netPayable - paidNowNum;

  // Add/Remove produce row
  const handleAddItem = () => {
    setItems((prev) => [...prev, createNewItem(defaultCropName)]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof ProduceItemRow, val: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  // Farmer Auto-complete
  const handlePartyNameChange = (val: string) => {
    setPartyName(val);
    if (!val.trim()) {
      setPartySuggestions([]);
      return;
    }
    const matches = existingParties.filter((p) =>
      p.name.toLowerCase().includes(val.toLowerCase())
    );
    setPartySuggestions(matches.slice(0, 5));
  };

  const handleSelectParty = (p: any) => {
    setPartyName(p.name);
    setPartyPhone(p.phone || "");
    setPartyVillage(p.village || "");
    setPartySuggestions([]);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!partyName.trim()) {
      setErrorMsg(lang === "mr" ? "कृपया शेतकऱ्याचे नाव प्रविष्ट करा." : "Please enter farmer name.");
      return;
    }
    if (partyPhone && partyPhone.length !== 10) {
      setErrorMsg(lang === "mr" ? "कृपया वैध १० अंकी मोबाईल नंबर प्रविष्ट करा." : "Please enter a valid 10-digit mobile number.");
      return;
    }

    for (let i = 0; i < calculatedItems.length; i++) {
      const it = calculatedItems[i];
      if (it.isOther && !it.customCropName.trim()) {
        setErrorMsg(
          lang === "mr"
            ? `धान्य #${i + 1} साठी कृपया इतर धान्याचे नाव टाइप करा.`
            : `Please enter produce name for item #${i + 1}.`
        );
        return;
      }
      if (it.parsedBags.length === 0) {
        setErrorMsg(
          lang === "mr"
            ? `धान्य #${i + 1} साठी कृपया पोत्यांचे वजन प्रविष्ट करा (उदा. 45 46 44).`
            : `Please enter bag weights for item #${i + 1} (e.g. 45 46 44).`
        );
        return;
      }
      if (!it.rate || it.rate <= 0) {
        setErrorMsg(
          lang === "mr"
            ? `धान्य #${i + 1} साठी कृपया प्रति किलो दर प्रविष्ट करा.`
            : `Please enter rate per KG for item #${i + 1}.`
        );
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await createBillAction({
          kind: "purchase",
          billDate,
          partyName,
          partyPhone,
          partyVillage,
          hamali: hamaliNum,
          paidNow: paidNowNum,
          note,
          items: calculatedItems.map((it) => ({
            productName: it.effectiveName,
            grade: it.grade.trim() || undefined,
            bagWeightsInput: it.bagWeightsInput,
            cutKg: it.cutKgNum,
            ratePerKg: it.rate,
          })),
        });

        if (res.success) {
          const fullBillObj = {
            id: res.billId,
            kind: "purchase",
            billNo: res.billNo,
            billDate,
            partyName,
            partyPhone,
            partyVillage,
            hamali: hamaliNum,
            paidNow: paidNowNum,
            note,
            items: calculatedItems.map((it) => ({
              productName: it.effectiveName,
              grade: it.grade.trim() || undefined,
              bagWeights: it.parsedBags,
              cutKg: it.cutKgNum,
              netKg: it.netKg,
              ratePerKg: it.rate,
              totalAmount: it.totalAmount,
            })),
          };

          setCreatedBill(fullBillObj);
          toast.success(
            `खरेदी बिल ${res.billNo} यशस्वीरित्या सेव्ह झाले!`,
            `Purchase Bill ${res.billNo} saved successfully.`
          );

          // Reset Form
          setItems([createNewItem(defaultCropName)]);
          setHamali("0");
          setPaidNow("0");
          setNote("");
          loadData();
        }
      } catch (err: any) {
        setErrorMsg(err.message || "बिल सेव्ह करताना त्रुटी आली.");
        toast.error("बिल सेव्ह करताना त्रुटी आली.", err.message);
      }
    });
  };

  // Delete & Restore Handlers
  const handleConfirmDelete = async (reason?: string) => {
    if (!deleteTarget) return;
    setActionInProgress(true);
    try {
      await deleteBillAction(deleteTarget.id, reason);
      toast.success(
        `बिल ${deleteTarget.no} हटवले गेले.`,
        `Bill ${deleteTarget.no} soft-deleted. Can be restored by admin.`
      );
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error("बिल डिलीट करता आले नाही.", err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setActionInProgress(true);
    try {
      await restoreBillAction(restoreTarget.id);
      toast.success(
        `बिल ${restoreTarget.no} पूर्ववत करण्यात आले!`,
        `Bill ${restoreTarget.no} restored successfully.`
      );
      setRestoreTarget(null);
      loadData();
    } catch (err: any) {
      toast.error("बिल रिस्टोअर करता आले नाही.", err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Direct PDF Download from List / Banner
  const handleDownloadPDF = async (b: any) => {
    setIsExporting(true);
    try {
      const fileName = await downloadBillPdf(b);
      toast.success("PDF डाऊनलोड झाला!", `Saved as ${fileName}`);
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.error("PDF डाऊनलोड करता आला नाही.", err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Direct WhatsApp Share from List / Banner (supports mobile share + desktop fallback)
  const handleShareWhatsApp = async (b: any) => {
    setIsExporting(true);
    try {
      await shareBillOnWhatsApp(b, (mr, en) => toast.info(mr, en));
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("WhatsApp share error:", err);
        toast.error("WhatsApp वर पाठवताना त्रुटी आली.", err.message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered Bills
  const filteredBills = recentBills.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.billNo.toLowerCase().includes(q) ||
      b.partyName.toLowerCase().includes(q) ||
      (b.partyVillage && b.partyVillage.toLowerCase().includes(q)) ||
      (b.items || []).some((it: any) => it.productName.toLowerCase().includes(q));

    const matchesStart = !startDate || b.billDate >= startDate;
    const matchesEnd = !endDate || b.billDate <= endDate;

    // Use allocation-based paid/due from server action (b.paidAmount, b.dueAmount)
    const due = Number(b.dueAmount) || 0;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "due" && due > 0.01) ||
      (statusFilter === "paid" && due <= 0.01);

    return matchesSearch && matchesStart && matchesEnd && matchesStatus;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredBills.length === 0) {
      toast.warning("डाऊनलोड करण्यासाठी कोणतीही बिले नाहीत.");
      return;
    }

    const headers = [
      "Bill No",
      "Date",
      "Farmer Name",
      "Village",
      "Phone",
      "Commodities",
      "Net KG",
      "Total Amount",
      "Hamali",
      "Paid Now",
      "Balance Due",
      "Status",
    ];

    const rows = filteredBills.map((b) => {
      const billNetKg = (b.items || []).reduce(
        (acc: number, it: any) => acc + (Number(it.netKg) || 0),
        0
      );
      const itemsTotal = (b.items || []).reduce(
        (acc: number, it: any) => acc + (Number(it.totalAmount) || 0),
        0
      );
      const hamaliDeduct = Number(b.hamali) || 0;
      const finalAmount = Math.max(0, itemsTotal - hamaliDeduct);
      const due = Number(b.dueAmount) || 0;
      const paidSoFar = Number(b.paidAmount) || 0;
      const cropList = (b.items || []).map((it: any) => it.productName).join("; ");

      return [
        b.billNo,
        formatDateDDMMYYYY(b.billDate),
        `"${b.partyName}"`,
        `"${b.partyVillage || ""}"`,
        b.partyPhone || "",
        `"${cropList}"`,
        billNetKg.toFixed(2),
        finalAmount.toFixed(2),
        hamaliDeduct.toFixed(2),
        paidSoFar.toFixed(2),
        due.toFixed(2),
        b.isDeleted ? "VOID" : due > 0 ? "DUE" : "PAID",
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chavan_Traders_Purchase_Bills_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV फाईल यशस्वीरित्या डाऊनलोड झाली!");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hidden container for rendering invoices off-screen to generate pristine PDFs */}
      <div
        style={{ position: "fixed", left: "-9999px", top: "-9999px", width: "750px" }}
        aria-hidden="true"
      >
        {exportingBill && (
          <MandiInvoicePaper
            bill={exportingBill}
            containerId="purchase-export-container"
          />
        )}
      </div>

      {/* Confirmation Dialog for Deleting Bill */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        titleMr="हे बिल हटवायचे आहे का?"
        titleEn="Delete this bill? This can be restored by the admin."
        messageMr={`तुम्हाला बिल क्र. ${deleteTarget?.no} हटवायचे आहे का? हे बिल सॉफ्ट डिलीट केले जाईल आणि ॲडमिनद्वारे पुन्हा पूर्ववत केले जाऊ शकते.`}
        messageEn="This bill will be soft-deleted and removed from balances, stock, and dashboard. It can be restored by the admin."
        confirmLabelMr="बिल हटवा (Delete)"
        confirmLabelEn="Delete Bill"
        requireReason={true}
        isDestructive={true}
        isPending={actionInProgress}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Confirmation Dialog for Restoring Bill */}
      <ConfirmDialog
        isOpen={!!restoreTarget}
        titleMr="हे बिल पूर्ववत करायचे आहे का?"
        titleEn="Restore this voided bill?"
        messageMr={`बिल क्र. ${restoreTarget?.no} पूर्ववत केल्यास हे बिल पुन्हा चालू हिशोब आणि अहवालांमध्ये समाविष्ट होईल.`}
        messageEn="Restoring this bill will include it back in reports, stock, and party balance."
        confirmLabelMr="पूर्ववत करा (Restore)"
        confirmLabelEn="Restore Bill"
        requireReason={false}
        isDestructive={false}
        isPending={actionInProgress}
        onConfirm={handleConfirmRestore}
        onClose={() => setRestoreTarget(null)}
      />

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#8b1a2b] dark:text-[#f8ecc4] flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7" />
            <span>{lang === "mr" ? "शेतकरी खरेदी बिल (Farmer Purchase)" : "Farmer Purchase Invoice"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            {lang === "mr"
              ? "शेतकऱ्यांकडून धान्य खरेदी, पोती वजन नोंदी, एका बिलात अनेक धान्ये आणि तत्काळ PDF पावती."
              : "Record grain purchase from farmers, multi-produce weights arithmetic, instant PDF and WhatsApp share."}
          </p>
        </div>
      </div>

      {/* Bill Saved Banner (Shows exactly THREE things: PDF Download, Single WhatsApp, View Invoice) */}
      {createdBill && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
                खरेदी बिल यशस्वीरित्या सेव्ह झाले!
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                बिल क्रमांक: <strong className="font-mono text-sm">{createdBill.billNo}</strong> • {createdBill.partyName}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* 1. PDF Download */}
            <button
              onClick={() => handleDownloadPDF(createdBill)}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8b1a2b] text-white text-xs font-semibold shadow hover:bg-[#701522] transition-all cursor-pointer disabled:opacity-50"
              title="A4 PDF डाऊनलोड करा"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? "तयार होत आहे..." : "PDF डाऊनलोड करा"}</span>
            </button>

            {/* 2. ONE Single WhatsApp Share */}
            <button
              onClick={() => handleShareWhatsApp(createdBill)}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1f4d33] text-white text-xs font-semibold shadow hover:bg-[#163825] transition-all cursor-pointer disabled:opacity-50"
              title="WhatsApp वर PDF पाठवा"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp वर पाठवा</span>
            </button>

            {/* 3. View Full Invoice Page */}
            <Link
              href={`/app/invoice/${createdBill.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-semibold shadow-xs hover:border-[#8b1a2b] transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-[#8b1a2b]" />
              <span>बिल पावती पहा</span>
            </Link>

            <button
              onClick={() => setCreatedBill(null)}
              className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
            >
              नवीन बिल
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid: Left Form (7 cols), Right Calculation Box (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
          >
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* 4-Column Header Row (Image 3 format: Date | Farmer Name | Mobile | Village) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <DatePicker
                  label={isMarathi ? "तारीख" : "Date"}
                  value={billDate}
                  onChange={setBillDate}
                />
              </div>

              <div className="relative sm:col-span-1">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isMarathi ? "शेतकरी नाव *" : "Farmer Name *"}
                </label>
                <input
                  type="text"
                  placeholder={isMarathi ? "उदा. आनंदराव पाटील" : "e.g. Anand Patil"}
                  value={partyName}
                  onChange={(e) => handlePartyNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm focus:ring-2 focus:ring-[#8b1a2b]"
                  required
                />
                {partySuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                    {partySuggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectParty(p)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-stone-100 dark:hover:bg-stone-700 flex justify-between items-center border-b border-stone-100 dark:border-stone-700/50"
                      >
                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                          {p.name}
                        </span>
                        <span className="text-stone-400 text-[11px]">
                          {p.village ? `${p.village} • ` : ""}
                          {p.phone || ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isMarathi ? "मोबाईल" : "Mobile"}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={10}
                  placeholder={isMarathi ? "१० अंकी मोबाईल" : "10-digit mobile"}
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono focus:ring-2 focus:ring-[#8b1a2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isMarathi ? "गाव / पत्ता" : "Village / Location"}
                </label>
                <input
                  type="text"
                  placeholder={isMarathi ? "उदा. उत्तूर" : "e.g. Uttur"}
                  value={partyVillage}
                  onChange={(e) => setPartyVillage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm focus:ring-2 focus:ring-[#8b1a2b]"
                />
              </div>
            </div>

            {/* Produce Rows (Exact horizontal structure from Image 3) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  धान्य व वजन नोंदी (Produce Details)
                </span>
                <span className="text-xs text-stone-500">
                  {items.length} धान्य प्रकार जोडले
                </span>
              </div>

              {items.map((row, index) => {
                const isOther =
                  row.cropName === "इतर धान्ये" ||
                  row.cropName === "Other Produce" ||
                  row.cropName.includes("इतर");

                return (
                  <div
                    key={row.id}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#8b1a2b] dark:text-[#f8ecc4]">
                        #{index + 1} धान्य तपशील
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(row.id)}
                          className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                          title="धान्य काढा"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Commodity Dropdown */}
                      <div className={isOther ? "sm:col-span-3" : "sm:col-span-5"}>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          धान्य प्रकार *
                        </label>
                        <select
                          value={row.cropName}
                          onChange={(e) =>
                            handleUpdateItem(row.id, "cropName", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-medium focus:ring-2 focus:ring-[#8b1a2b]"
                        >
                          {COMMODITIES.map((c) => (
                            <option
                              key={c.code}
                              value={lang === "mr" ? c.nameMr : c.nameEn}
                            >
                              {lang === "mr" ? c.nameMr : c.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Crop Name if Other */}
                      {isOther && (
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            धान्याचे नाव टाइप करा *
                          </label>
                          <input
                            type="text"
                            placeholder="उदा. ज्वारी, गहू"
                            value={row.customCropName}
                            onChange={(e) =>
                              handleUpdateItem(row.id, "customCropName", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs focus:ring-2 focus:ring-[#8b1a2b]"
                          />
                        </div>
                      )}

                      {/* Grade (Optional) */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          ग्रेड / प्रत
                        </label>
                        <input
                          type="text"
                          placeholder="A/B"
                          value={row.grade}
                          onChange={(e) =>
                            handleUpdateItem(row.id, "grade", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs focus:ring-2 focus:ring-[#8b1a2b]"
                        />
                      </div>

                      {/* Cut KG */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          कट (KG)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          placeholder="0"
                          value={row.cutKg}
                          onChange={(e) =>
                            handleUpdateItem(row.id, "cutKg", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono focus:ring-2 focus:ring-[#8b1a2b]"
                        />
                      </div>

                      {/* Rate per KG */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          दर प्रति किलो (₹/KG) *
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="उदा. 34.50"
                          value={row.ratePerKg}
                          onChange={(e) =>
                            handleUpdateItem(row.id, "ratePerKg", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono font-bold focus:ring-2 focus:ring-[#8b1a2b]"
                          required
                        />
                      </div>
                    </div>

                    {/* Bag Weights Input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        पोत्यांचे वजन (Bag weights: उदा. 45 46.5 44 47 किंवा 45+46+44) *
                      </label>
                      <input
                        type="text"
                        placeholder="उदा. 45 46 44 47 48"
                        value={row.bagWeightsInput}
                        onChange={(e) =>
                          handleUpdateItem(row.id, "bagWeightsInput", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono focus:ring-2 focus:ring-[#8b1a2b]"
                        required
                      />
                    </div>
                  </div>
                );
              })}

              {/* Add Product Button */}
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2.5 rounded-xl border border-dashed border-[#8b1a2b]/60 dark:border-[#f8ecc4]/40 text-[#8b1a2b] dark:text-[#f8ecc4] text-xs font-bold hover:bg-[#8b1a2b]/5 dark:hover:bg-[#8b1a2b]/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ आणखी धान्य जोडा (Add Product)</span>
              </button>
            </div>

            {/* Deductions: Hamali, Paid Now, Note */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  हमाली / इतर वजावट (₹)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={hamali}
                  onChange={(e) => setHamali(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono focus:ring-2 focus:ring-[#8b1a2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  आता दिलेली रक्कम (Paid Now ₹)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={paidNow}
                  onChange={(e) => setPaidNow(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono font-bold focus:ring-2 focus:ring-[#8b1a2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  टीप / Note (ऐच्छिक)
                </label>
                <input
                  type="text"
                  placeholder="उदा. टोकन दिले, माल उत्तम"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm focus:ring-2 focus:ring-[#8b1a2b]"
                />
              </div>
            </div>

            {/* Save Bill Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-[#8b1a2b] hover:bg-[#701522] text-white text-sm font-bold shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isMarathi ? "बिल सेव्ह होत आहे..." : "Saving Bill..."}</span>
                </>
              ) : (
                <>
                  <span>{isMarathi ? "खरेदी बिल सेव्ह करा (Save Bill)" : "Save Purchase Bill"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Calculation Box */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-[#8b1a2b] dark:text-[#f8ecc4] border-b border-stone-200 dark:border-stone-800 pb-2">
              हिशोब सारांश (Bill Summary)
            </h3>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>एकूण पोती (Total Bags):</span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  {totalBags} पोती
                </span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>एकूण वजन (Gross KG):</span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  {totalGrossKg.toFixed(2)} KG
                </span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>कट वजावट (Cut KG):</span>
                <span className="font-mono text-red-600 font-semibold">
                  - {totalCutKg.toFixed(2)} KG
                </span>
              </div>
              <div className="flex justify-between text-stone-900 dark:text-stone-100 font-bold border-t border-dashed border-stone-200 dark:border-stone-700 pt-2">
                <span>निव्वळ वजन (Net KG):</span>
                <span className="font-mono text-[#1f4d33] dark:text-[#8fd6a8]">
                  {formatWeight(totalNetKg)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>मालाची एकूण रक्कम:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  {formatIndianCurrency(totalItemsAmount)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>हमाली वजावट:</span>
                <span className="font-mono text-red-600 font-semibold">
                  - {formatIndianCurrency(hamaliNum)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#8b1a2b] dark:text-[#f8ecc4] border-t border-stone-200 dark:border-stone-700 pt-2">
                <span>निव्वळ देय रक्कम:</span>
                <span className="font-mono">{formatIndianCurrency(netPayable)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>आता दिलेली रक्कम:</span>
                <span className="font-mono">{formatIndianCurrency(paidNowNum)}</span>
              </div>
            </div>

            {/* Balance Due Box */}
            <div
              className={`p-4 rounded-xl flex items-center justify-between border ${
                balanceDue > 0
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50"
                  : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
              }`}
            >
              <div>
                <div className="text-xs uppercase font-semibold text-stone-500">
                  शिल्लक बाकी (DUE)
                </div>
                <div
                  className={`text-2xl font-bold font-mono ${
                    balanceDue > 0
                      ? "text-red-700 dark:text-red-400"
                      : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {formatIndianCurrency(Math.max(0, balanceDue))}
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  balanceDue > 0
                    ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                }`}
              >
                {balanceDue > 0 ? "बाकी देणे" : "पूर्ण भरले"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bills List with Search, Date Range Filter, Status Filter, CSV Export, Restore & Delete */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#8b1a2b] dark:text-[#f8ecc4]">
              खरेदी बिल नोंदवही (Purchase Bills Register)
            </h2>
            <p className="text-xs text-stone-500">
              एकूण {filteredBills.length} बिले दाखवली आहेत.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Admin Toggle: Show Deleted Bills */}
            {isAdmin && (
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="rounded text-[#8b1a2b] focus:ring-[#8b1a2b]"
                />
                <span>रद्द केलेली बिले (Show Deleted)</span>
              </label>
            )}

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:border-[#8b1a2b] hover:text-[#8b1a2b] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV डाऊनलोड</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="बिल क्र., शेतकरी, गाव, धान्य शोधा..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent focus:ring-2 focus:ring-[#8b1a2b]"
            />
          </div>

          {/* Start Date */}
          <div>
            <DatePicker
              placeholder={isMarathi ? "तारीख पासून" : "From Date"}
              value={startDate}
              onChange={setStartDate}
            />
          </div>

          {/* End Date */}
          <div>
            <DatePicker
              placeholder={isMarathi ? "तारीख पर्यंत" : "To Date"}
              value={endDate}
              onChange={setEndDate}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent focus:ring-2 focus:ring-[#8b1a2b]"
            >
              <option value="all">{isMarathi ? "सर्व बिले" : "All Bills"}</option>
              <option value="due">{isMarathi ? "बाकी रक्कम असणारी" : "Pending Dues"}</option>
              <option value="paid">{isMarathi ? "पूर्ण भरलेली" : "Fully Paid"}</option>
            </select>
          </div>
        </div>

        {/* Table of Bills - Desktop (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 bg-stone-50 dark:bg-stone-800/50">
                <th className="py-3 px-3">बिल क्र.</th>
                <th className="py-3 px-3">तारीख</th>
                <th className="py-3 px-3">शेतकरी नाव</th>
                <th className="py-3 px-3">धान्य तपशील</th>
                <th className="py-3 px-3 text-right">निव्वळ वजन</th>
                <th className="py-3 px-3 text-right">रक्कम</th>
                <th className="py-3 px-3 text-right">बाकी</th>
                <th className="py-3 px-3 text-center">कृती (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">
                    कोणतेही खरेदी बिल आढळले नाही.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => {
                  const billNetKg = (b.items || []).reduce(
                    (acc: number, it: any) => acc + (Number(it.netKg) || 0),
                    0
                  );
                  const itemsTotal = (b.items || []).reduce(
                    (acc: number, it: any) => acc + (Number(it.totalAmount) || 0),
                    0
                  );
                  const hamaliDeduct = Number(b.hamali) || 0;
                  const finalAmount = Math.max(0, itemsTotal - hamaliDeduct);
                  // Use allocation-based due from server action
                  const due = Number(b.dueAmount) ?? (finalAmount - (Number(b.paidNow) || 0));

                  const itemsListStr = (b.items || [])
                    .map((it: any) => `${it.productName}${it.grade ? ` (${it.grade})` : ""}`)
                    .join(", ");

                  const isDeleted = !!b.isDeleted;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${
                        isDeleted ? "bg-red-50/30 dark:bg-red-950/20 opacity-75" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-[#8b1a2b] dark:text-[#f8ecc4] whitespace-nowrap">
                        {b.billNo}
                        {isDeleted && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                            रद्द (Void)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-stone-600 dark:text-stone-400 whitespace-nowrap font-mono text-xs">
                        {formatDateDDMMYYYY(b.billDate)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-900 dark:text-stone-100">
                        {b.partyName}
                        {b.partyVillage && (
                          <span className="text-xs text-stone-500 font-normal ml-1">
                            ({b.partyVillage})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-stone-600 dark:text-stone-300 max-w-xs truncate">
                        {itemsListStr || "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {formatWeight(billNetKg)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {formatIndianCurrency(finalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            due > 0.01
                              ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {due > 0.01 ? formatIndianCurrency(due) : "पूर्ण"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. View Invoice Link */}
                          <Link
                            href={`/app/invoice/${b.id}`}
                            title="पावती पहा (View Invoice)"
                            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-[#8b1a2b] hover:text-[#8b1a2b] transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>

                          {/* 2. Download PDF button */}
                          <button
                            onClick={() => handleDownloadPDF(b)}
                            disabled={isExporting}
                            title="A4 PDF डाऊनलोड करा (Download PDF)"
                            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-[#8b1a2b] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* 3. Single WhatsApp Share button (shown on EVERY bill) */}
                          <button
                            onClick={() => handleShareWhatsApp(b)}
                            disabled={isExporting}
                            title="WhatsApp वर PDF पाठवा (Send on WhatsApp)"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* 4. Admin Restore button for Deleted Bills */}
                          {isDeleted && isAdmin && (
                            <button
                              onClick={() => setRestoreTarget({ id: b.id, no: b.billNo })}
                              title="बिल पूर्ववत करा (Restore Bill)"
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* 5. Delete button (Soft Delete with Modal, hidden for staff) */}
                          {!isDeleted && isAdmin && (
                            <button
                              onClick={() => setDeleteTarget({ id: b.id, no: b.billNo })}
                              title="बिल हटवा (Delete Bill)"
                              className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Stacked Cards for Mobile (< md) */}
        <div className="md:hidden space-y-3">
          {filteredBills.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              कोणतेही खरेदी बिल आढळले नाही.
            </div>
          ) : (
            filteredBills.map((b) => {
              const billNetKg = (b.items || []).reduce(
                (acc: number, it: any) => acc + (Number(it.netKg) || 0),
                0
              );
              const itemsTotal = (b.items || []).reduce(
                (acc: number, it: any) => acc + (Number(it.totalAmount) || 0),
                0
              );
              const hamaliDeduct = Number(b.hamali) || 0;
              const finalAmount = Math.max(0, itemsTotal - hamaliDeduct);
              const due = Number(b.dueAmount) ?? (finalAmount - (Number(b.paidNow) || 0));

              const itemsListStr = (b.items || [])
                .map((it: any) => `${it.productName}${it.grade ? ` (${it.grade})` : ""}`)
                .join(", ");

              const isDeleted = !!b.isDeleted;

              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-2.5 ${
                    isDeleted ? "bg-red-50/30 dark:bg-red-950/20 opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-[#8b1a2b] dark:text-[#f8ecc4]">
                          {b.billNo}
                        </span>
                        {isDeleted && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                            रद्द
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {formatDateDDMMYYYY(b.billDate)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                        due > 0.01
                          ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {due > 0.01 ? `बाकी: ${formatIndianCurrency(due)}` : "पूर्ण भरले"}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                      {b.partyName}
                      {b.partyVillage && (
                        <span className="text-xs text-stone-500 font-normal ml-1">
                          ({b.partyVillage})
                        </span>
                      )}
                    </div>
                    {itemsListStr && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 truncate mt-0.5">
                        🌾 {itemsListStr}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                    <span className="text-stone-500">
                      वजन: <strong className="text-stone-800 dark:text-stone-200 font-mono">{formatWeight(billNetKg)}</strong>
                    </span>
                    <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                      {formatIndianCurrency(finalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <Link
                      href={`/app/invoice/${b.id}`}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-[#8b1a2b] text-xs font-medium flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>पावती</span>
                    </Link>
                    <button
                      onClick={() => handleDownloadPDF(b)}
                      disabled={isExporting}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-[#8b1a2b] text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(b)}
                      disabled={isExporting}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    {isDeleted && isAdmin && (
                      <button
                        onClick={() => setRestoreTarget({ id: b.id, no: b.billNo })}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                        title="पूर्ववत करा"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isDeleted && isAdmin && (
                      <button
                        onClick={() => setDeleteTarget({ id: b.id, no: b.billNo })}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        title="हटवा"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
