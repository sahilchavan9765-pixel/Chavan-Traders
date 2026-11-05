"use client";

import React, { useState, useTransition, useEffect } from "react";
import {
  formatIndianCurrency,
  formatWeight,
  formatDateDDMMYYYY,
} from "@/lib/calculations";
import {
  CommodityStockSummary,
  StockMovement,
  KNOWN_COMMODITIES,
} from "@/lib/stock";
import { createStockAdjustmentAction } from "@/app/actions/stock.actions";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Boxes,
  Warehouse,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  Calendar,
  AlertTriangle,
  History,
  X,
  Loader2,
} from "lucide-react";

interface StockViewProps {
  initialReport: CommodityStockSummary[];
  initialValuation: number;
  initialInStockKg: number;
  initialMovements: StockMovement[];
}

export function StockView({
  initialReport,
  initialValuation,
  initialInStockKg,
  initialMovements,
}: StockViewProps) {
  const { isAdmin } = useUser();
  const { lang } = useLanguage();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [stockReport] = useState<CommodityStockSummary[]>(initialReport);
  const [movements] = useState<StockMovement[]>(initialMovements);
  const [totalValuation] = useState<number>(initialValuation);
  const [totalInStockKg] = useState<number>(initialInStockKg);

  // Filters
  const [filterCommodity, setFilterCommodity] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modal for Stock Adjustment
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjProduct, setAdjProduct] = useState<string>(KNOWN_COMMODITIES[0].nameMr);
  const [adjDate, setAdjDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [adjType, setAdjType] = useState<"wastage" | "moisture_loss" | "correction" | "opening_stock">("wastage");
  const [adjKg, setAdjKg] = useState<string>("");
  const [adjNote, setAdjNote] = useState<string>("");

  const isMr = lang === "mr";

  // Escape key closes adjustment modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAdjustModal && !isPending) {
        setShowAdjustModal(false);
      }
    };
    if (showAdjustModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showAdjustModal, isPending]);

  // Filter movements
  const filteredMovements = movements.filter((m) => {
    if (filterCommodity !== "ALL") {
      const match = m.product.toLowerCase().includes(filterCommodity.toLowerCase());
      if (!match) return false;
    }
    if (startDate && m.date < startDate) return false;
    if (endDate && m.date > endDate) return false;
    return true;
  });

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(adjKg);
    if (isNaN(kg) || kg <= 0) {
      toast.error(
        isMr ? "कृपया वैध वजन प्रविष्ट करा" : "Please enter a valid weight",
        isMr ? "वजन शून्यापेक्षा जास्त असावे" : "Weight must be greater than 0"
      );
      return;
    }

    const signedKg = adjType === "wastage" || adjType === "moisture_loss" ? -Math.abs(kg) : Math.abs(kg);

    startTransition(async () => {
      try {
        await createStockAdjustmentAction({
          product: adjProduct,
          date: adjDate,
          kgChange: signedKg,
          reason: adjType,
          note: adjNote,
        });
        toast.success(
          isMr ? "स्टॉक दुरुस्ती यशस्वीपणे सेव्ह झाली!" : "Stock adjustment saved!",
          `${adjProduct}: ${signedKg > 0 ? "+" : ""}${signedKg} KG`
        );
        setShowAdjustModal(false);
        setAdjKg("");
        setAdjNote("");
        window.location.reload();
      } catch (err: any) {
        toast.error(
          isMr ? "दुरुस्ती सेव्ह करता आली नाही" : "Failed to save adjustment",
          err?.message || "Error"
        );
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#8b1a2b] dark:text-[#f8ecc4] flex items-center gap-2.5">
            <Boxes className="w-7 h-7" />
            <span>{isMr ? "गोदाम स्टॉक आणि मूल्यांकन" : "Stock & Warehouse"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            {isMr
              ? "धान्यनिहाय खरेदी, विक्री, शिल्लक वजन, सरासरी खरेदी दर आणि एकूण स्टॉक मूल्य."
              : "Produce-wise purchases, sales, balance weight, average buy rate, and inventory valuation."}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAdjustModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8b1a2b] hover:bg-[#701522] text-white font-semibold text-xs sm:text-sm transition-all shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>{isMr ? "स्टॉक दुरुस्ती (Stock Adjustment)" : "Record Adjustment"}</span>
          </button>
        )}
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-[#8b1a2b] to-[#6d1320] text-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between opacity-90 text-xs font-semibold uppercase tracking-wider">
            <span>{isMr ? "एकूण गोदाम स्टॉक मूल्य (Inventory Valuation)" : "Total Inventory Valuation"}</span>
            <Warehouse className="w-5 h-5 text-[#f8ecc4]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold font-mono mt-3 tabular-nums whitespace-nowrap">
            {formatIndianCurrency(totalValuation)}
          </div>
          <div className="text-xs text-stone-200 mt-2">
            {isMr ? "शिल्लक साठा × सरासरी खरेदी दर सूत्रावर आधारित" : "Calculated as In-Stock KG × Average Buy Rate"}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1f4d33] to-[#163825] text-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between opacity-90 text-xs font-semibold uppercase tracking-wider">
            <span>{isMr ? "एकूण शिल्लक माल वजन (Total Stock Weight)" : "Total Stock Weight"}</span>
            <Boxes className="w-5 h-5 text-[#f8ecc4]" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold font-mono mt-3 tabular-nums whitespace-nowrap">
            {formatWeight(totalInStockKg)}
          </div>
          <div className="text-xs text-stone-200 mt-2">
            {isMr ? "गोदामातील प्रत्यक्ष शिल्लक मालाचे निव्वळ वजन" : "Current physical net stock weight across all commodities"}
          </div>
        </div>
      </div>

      {/* Stock Breakdown Section */}
      <div className="bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>{isMr ? "धान्यनिहाय स्टॉक तपशील (Commodity-wise Stock)" : "Commodity-wise Stock Summary"}</span>
          </h2>
          <span className="text-xs text-stone-500">
            {stockReport.length} {isMr ? "धान्य प्रकार नोंदवले" : "commodities tracked"}
          </span>
        </div>

        {/* Desktop Table View (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 bg-stone-50/80 dark:bg-stone-800/40">
                <th className="py-3 px-3 font-semibold">{isMr ? "धान्य (Commodity)" : "Commodity"}</th>
                <th className="py-3 px-3 text-right font-semibold">{isMr ? "खरेदी (Bought KG)" : "Bought (KG)"}</th>
                <th className="py-3 px-3 text-right font-semibold">{isMr ? "विक्री (Sold KG)" : "Sold (KG)"}</th>
                <th className="py-3 px-3 text-right font-semibold">{isMr ? "दुरुस्ती (Adjusted)" : "Adjusted (KG)"}</th>
                <th className="py-3 px-3 text-right font-bold text-stone-900 dark:text-stone-100">{isMr ? "शिल्लक स्टॉक (In Stock)" : "In Stock (KG)"}</th>
                <th className="py-3 px-3 text-right font-semibold">{isMr ? "सरासरी खरेदी भाव" : "Avg Buy Rate"}</th>
                <th className="py-3 px-3 text-right font-bold text-stone-900 dark:text-stone-100">{isMr ? "मूल्य (Valuation)" : "Valuation"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {stockReport.map((p) => {
                const isNegative = p.inStockKg < 0;
                return (
                  <tr key={p.key} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        {p.nameMr}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">{p.nameEn}</div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-stone-700 dark:text-stone-300 tabular-nums">
                      {formatWeight(p.boughtKg)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-stone-700 dark:text-stone-300 tabular-nums">
                      {formatWeight(p.soldKg)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-stone-600 dark:text-stone-400 tabular-nums">
                      {p.adjustmentKg !== 0 ? `${p.adjustmentKg > 0 ? "+" : ""}${formatWeight(p.adjustmentKg)}` : "—"}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-base tabular-nums">
                      <span
                        className={
                          isNegative
                            ? "text-[#8b1a2b] dark:text-[#f28b9b] inline-flex items-center gap-1"
                            : p.inStockKg > 0
                            ? "text-[#1f4d33] dark:text-[#7dd39c]"
                            : "text-stone-400"
                        }
                      >
                        {isNegative && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline" />}
                        {formatWeight(p.inStockKg)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-stone-800 dark:text-stone-200 tabular-nums">
                      {p.avgBuyRate > 0 ? `₹${p.avgBuyRate.toFixed(2)}` : "—"}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100 text-sm tabular-nums whitespace-nowrap">
                      {p.valuation > 0 ? formatIndianCurrency(p.valuation) : "₹0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards View (<md) */}
        <div className="md:hidden space-y-3">
          {stockReport.map((p) => {
            const isNegative = p.inStockKg < 0;
            return (
              <div
                key={p.key}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                      {p.nameMr}
                    </h3>
                    <div className="text-xs text-stone-500">{p.nameEn}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-lg font-bold font-mono tabular-nums ${
                        isNegative
                          ? "text-[#8b1a2b] dark:text-[#f28b9b]"
                          : p.inStockKg > 0
                          ? "text-[#1f4d33] dark:text-[#7dd39c]"
                          : "text-stone-500"
                      }`}
                    >
                      {formatWeight(p.inStockKg)}
                    </span>
                    <div className="text-[10px] text-stone-500 uppercase">{isMr ? "शिल्लक स्टॉक" : "In Stock"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
                  <div>
                    <span className="text-stone-500 block text-[10px]">{isMr ? "खरेदी" : "Bought"}</span>
                    <span className="font-mono font-medium">{formatWeight(p.boughtKg)}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">{isMr ? "विक्री" : "Sold"}</span>
                    <span className="font-mono font-medium">{formatWeight(p.soldKg)}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">{isMr ? "सरासरी भाव" : "Avg Rate"}</span>
                    <span className="font-mono font-medium">{p.avgBuyRate > 0 ? `₹${p.avgBuyRate.toFixed(2)}` : "—"}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-xs font-bold">
                  <span className="text-stone-700 dark:text-stone-300">{isMr ? "स्टॉक मूल्य (Valuation)" : "Valuation"}</span>
                  <span className="font-mono text-sm text-stone-900 dark:text-stone-100 whitespace-nowrap">
                    {p.valuation > 0 ? formatIndianCurrency(p.valuation) : "₹0"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock Movement Ledger Section */}
      <div className="bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <History className="w-5 h-5 text-[#8b1a2b] dark:text-[#f8ecc4]" />
            <span>{isMr ? "स्टॉक हालचाल लेजर (Stock Movement Ledger)" : "Stock Movement Ledger"}</span>
          </h2>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700">
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={filterCommodity}
                onChange={(e) => setFilterCommodity(e.target.value)}
                className="bg-transparent text-stone-800 dark:text-stone-200 outline-none cursor-pointer text-xs"
              >
                <option value="ALL">{isMr ? "सर्व धान्ये (All)" : "All Commodities"}</option>
                {KNOWN_COMMODITIES.map((c) => (
                  <option key={c.code} value={c.nameMr}>
                    {c.nameMr} ({c.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 px-2 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700">
              <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder={isMr ? "पासून" : "From"}
                className="text-xs"
              />
              <span className="text-stone-400 mx-1">ते</span>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder={isMr ? "पर्यंत" : "To"}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Desktop Ledger Table (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 bg-stone-50/80 dark:bg-stone-800/40">
                <th className="py-2.5 px-3 font-semibold">{isMr ? "दिनांक" : "Date"}</th>
                <th className="py-2.5 px-3 font-semibold">{isMr ? "प्रकार" : "Type"}</th>
                <th className="py-2.5 px-3 font-semibold">{isMr ? "संदर्भ क्र." : "Ref No."}</th>
                <th className="py-2.5 px-3 font-semibold">{isMr ? "शेतकरी / ग्राहक / कारण" : "Party / Reason"}</th>
                <th className="py-2.5 px-3 font-semibold">{isMr ? "धान्य" : "Commodity"}</th>
                <th className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">{isMr ? "आवक (+ IN)" : "+ IN (KG)"}</th>
                <th className="py-2.5 px-3 text-right font-semibold text-red-700 dark:text-red-400">{isMr ? "जावक (- OUT)" : "- OUT (KG)"}</th>
                <th className="py-2.5 px-3 text-right font-semibold">{isMr ? "दर (₹/KG)" : "Rate (₹)"}</th>
                <th className="py-2.5 px-3 text-right font-bold text-stone-900 dark:text-stone-100">{isMr ? "चालू शिल्लक" : "Balance (KG)"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400 text-xs">
                    {isMr ? "कोणतीही स्टॉक हालचाल आढळली नाही." : "No stock movements recorded yet."}
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30">
                    <td className="py-2.5 px-3 font-mono text-stone-600 dark:text-stone-400 whitespace-nowrap">
                      {formatDateDDMMYYYY(m.date)}
                    </td>
                    <td className="py-2.5 px-3">
                      {m.type === "purchase" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>{isMr ? "खरेदी आवक" : "Purchase"}</span>
                        </span>
                      ) : m.type === "sale" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>{isMr ? "विक्री जावक" : "Sale"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                          <Sliders className="w-3 h-3" />
                          <span>{isMr ? "स्टॉक दुरुस्ती" : "Adjustment"}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-stone-800 dark:text-stone-200">
                      {m.referenceNo}
                    </td>
                    <td className="py-2.5 px-3 text-stone-700 dark:text-stone-300">
                      {m.partyName}
                      {m.note && <span className="text-[11px] text-stone-500 dark:text-stone-400 block">{m.note}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-stone-800 dark:text-stone-200 font-medium">
                      {m.product}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {m.inKg > 0 ? `+${formatWeight(m.inKg)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700 dark:text-red-400 tabular-nums">
                      {m.outKg > 0 ? `-${formatWeight(m.outKg)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-700 dark:text-stone-300 tabular-nums">
                      {m.ratePerKg > 0 ? `₹${m.ratePerKg}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap tabular-nums">
                      {m.runningBalance !== undefined ? formatWeight(m.runningBalance) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Ledger Cards View (<md) */}
        <div className="md:hidden space-y-3">
          {filteredMovements.length === 0 ? (
            <div className="py-8 text-center text-stone-500 text-xs">
              {isMr ? "कोणतीही स्टॉक हालचाल आढळली नाही." : "No stock movements recorded yet."}
            </div>
          ) : (
            filteredMovements.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-stone-600 dark:text-stone-400">
                      {formatDateDDMMYYYY(m.date)}
                    </span>
                    <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                      {m.referenceNo}
                    </span>
                  </div>
                  <div>
                    {m.type === "purchase" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        <ArrowDownLeft className="w-3 h-3" />
                        <span>{isMr ? "खरेदी" : "Purchase"}</span>
                      </span>
                    ) : m.type === "sale" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{isMr ? "विक्री" : "Sale"}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                        <Sliders className="w-3 h-3" />
                        <span>{isMr ? "दुरुस्ती" : "Adj"}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-baseline">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100">{m.partyName}</div>
                    <div className="text-[11px] text-stone-500">{m.product}</div>
                  </div>
                  <div className="text-right">
                    {m.inKg > 0 && (
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        +{formatWeight(m.inKg)}
                      </span>
                    )}
                    {m.outKg > 0 && (
                      <span className="font-mono font-bold text-red-700 dark:text-red-400 text-sm">
                        -{formatWeight(m.outKg)}
                      </span>
                    )}
                    {m.ratePerKg > 0 && (
                      <div className="text-[10px] text-stone-500 font-mono">₹{m.ratePerKg}/KG</div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-[11px]">
                  <span className="text-stone-500">{isMr ? "चालू शिल्लक" : "Running Balance"}</span>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                    {m.runningBalance !== undefined ? formatWeight(m.runningBalance) : "—"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: Record Stock Adjustment */}
      {showAdjustModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAdjustModal(false)}
        >
          <div
            className="bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#8b1a2b] dark:text-[#f8ecc4]" />
                <span>{isMr ? "नवीन स्टॉक दुरुस्ती नोंदवा" : "Record Stock Adjustment"}</span>
              </h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                aria-label="Close modal"
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isMr ? "धान्य प्रकार (Produce)" : "Commodity"}
                </label>
                <select
                  value={adjProduct}
                  onChange={(e) => setAdjProduct(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm"
                >
                  {KNOWN_COMMODITIES.map((c) => (
                    <option key={c.code} value={c.nameMr}>
                      {c.nameMr} ({c.nameEn})
                    </option>
                  ))}
                  <option value="इतर धान्य">इतर धान्य (Other Produce)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isMr ? "तारीख (Date)" : "Date"}
                </label>
                <input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isMr ? "दुरुस्तीचे कारण (Reason)" : "Adjustment Reason"}
                </label>
                <select
                  value={adjType}
                  onChange={(e: any) => setAdjType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm"
                >
                  <option value="wastage">{isMr ? "घट / नासाडी (Wastage - वजा)" : "Wastage (- Loss)"}</option>
                  <option value="moisture_loss">{isMr ? "ओलावा कमी (Moisture Loss - वजा)" : "Moisture Loss (- Loss)"}</option>
                  <option value="opening_stock">{isMr ? "प्रारंभिक शिल्लक (Opening Stock - जमा)" : "Opening Stock (+ Add)"}</option>
                  <option value="correction">{isMr ? "स्टॉक सुधारणा (Manual Correction)" : "Manual Correction"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isMr ? "वजन (KG)" : "Quantity (KG)"}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={adjKg}
                  onChange={(e) => setAdjKg(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {isMr ? "टीप (Note)" : "Note"}
                </label>
                <input
                  type="text"
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder={isMr ? "उदा. पोते फाटल्यामुळे घट" : "Optional details"}
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
                >
                  {isMr ? "रद्द करा" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#8b1a2b] hover:bg-[#701522] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isPending ? (isMr ? "जतन होत आहे..." : "Saving...") : (isMr ? "दुरुस्ती जतन करा" : "Save Adjustment")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
