"use client";

import { useState } from "react";
import {
  formatIndianCurrency,
  formatWeight,
  numberToMarathiWords,
} from "@/lib/calculations";
import {
  downloadBillPdf,
  shareBillOnWhatsApp,
  formatDateDDMMYYYY,
  type BillPdfData,
} from "@/lib/pdf-generator";
import { useToast } from "@/context/ToastContext";
import { Share2, ArrowLeft, Download, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

export interface InvoiceBillItem {
  id?: string;
  productName: string;
  grade?: string | null;
  bagWeights: any;
  cutKg: string | number;
  netKg: string | number;
  ratePerKg: string | number;
  totalAmount: string | number;
}

export interface InvoiceBill {
  id: string;
  kind: "purchase" | "sale";
  billNo: string;
  billDate: string;
  partyName: string;
  partyPhone?: string | null;
  partyVillage?: string | null;
  hamali: string | number;
  paidNow: string | number;
  note?: string | null;
  isDeleted?: boolean;
  deleteReason?: string | null;
  items: InvoiceBillItem[];
}

interface MandiInvoiceProps {
  bill: InvoiceBill;
}

export function MandiInvoicePaper({
  bill,
  containerId = "mandi-invoice-container",
}: {
  bill: InvoiceBill;
  containerId?: string;
}) {
  const isPurchase = bill.kind === "purchase";
  const totalNetKg = (bill.items || []).reduce(
    (acc, it) => acc + (Number(it.netKg) || 0),
    0
  );
  const itemsTotal = (bill.items || []).reduce(
    (acc, it) => acc + (Number(it.totalAmount) || 0),
    0
  );
  const hamali = Number(bill.hamali) || 0;
  const netPayable = Math.max(0, itemsTotal - hamali);
  const paidNow = Number(bill.paidNow) || 0;
  const balanceDue = netPayable - paidNow;
  const isPaid = balanceDue <= 0;

  const marathiWords = numberToMarathiWords(netPayable);

  return (
    <div
      id={containerId}
      className="bg-white border border-stone-300 rounded-2xl shadow-md overflow-hidden text-stone-900 print:border-none print:shadow-none print:rounded-none"
    >
      {/* Void Banner for Deleted Bills */}
      {bill.isDeleted && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-xs font-bold tracking-wider flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>हे बिल रद्द (VOID / DELETED) केलेले आहे. {bill.deleteReason ? `कारण: ${bill.deleteReason}` : ""}</span>
        </div>
      )}

      {/* Soft Pink Header Box */}
      <div
        style={{ backgroundColor: "#fad4d4" }}
        className="px-6 py-5 text-center text-[#701522] border-b border-[#fad4d4]"
      >
        <h1 className="font-serif text-3xl font-extrabold tracking-tight">
          चव्हाण ट्रेडर्स
        </h1>
        <div className="text-sm font-semibold text-stone-900 mt-1">
          कै. श्री. रमेश कृष्णा चव्हाण
        </div>
        <div className="text-xs text-stone-700 mt-0.5">
          मु.पो. उत्तूर, तळेगळ्ळी, ता. आजरा, जि. कोल्हापूर.
        </div>
        <div className="text-xs font-semibold text-stone-800 mt-0.5 font-mono">
          मो. 9765941078 • 9850815527
        </div>
      </div>

      {/* Bill Title & Status Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100">
        <div className="font-serif font-bold text-2xl text-stone-900">
          {isPurchase ? "खरेदी बिल" : "विक्री बिल"}
        </div>

        <div>
          {isPaid ? (
            <span
              style={{ backgroundColor: "#d4ecd9" }}
              className="text-[#1f4d33] px-3.5 py-1 rounded-md text-xs font-bold"
            >
              पूर्ण भरले
            </span>
          ) : (
            <span
              style={{ backgroundColor: "#fcedbe" }}
              className="text-[#7c4a03] px-3.5 py-1 rounded-md text-xs font-bold"
            >
              बाकी रक्कम
            </span>
          )}
        </div>
      </div>

      {/* Party Details & Bill Metadata Box (2 Columns) */}
      <div className="px-6 py-3.5 grid grid-cols-2 gap-6 border-b border-stone-200 text-xs sm:text-sm">
        {/* Left Column: Party Details */}
        <div>
          <div className="text-xs text-stone-400 font-medium mb-0.5">
            {isPurchase ? "शेतकरी" : "ग्राहक"}
          </div>
          <div className="font-bold text-base text-stone-900 leading-snug">
            {bill.partyName}
          </div>
          {bill.partyVillage && (
            <div className="text-stone-600 text-xs mt-0.5 font-medium">
              {bill.partyVillage}
            </div>
          )}
          {bill.partyPhone && (
            <div className="text-stone-600 text-xs mt-0.5 font-mono">
              {bill.partyPhone}
            </div>
          )}
        </div>

        {/* Right Column: Bill Meta */}
        <div className="border-l border-stone-200 pl-6">
          <div className="text-xs text-stone-400 font-medium mb-0.5">
            बिल तपशील
          </div>
          <div className="font-bold text-base text-stone-900 font-mono">
            बिल क्र. {bill.billNo}
          </div>
          <div className="text-stone-700 text-xs mt-0.5 font-medium">
            दिनांक {formatDateDDMMYYYY(bill.billDate)}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#fbfaf8] border-b border-stone-200 text-stone-500 font-semibold text-xs">
              <th className="py-2 px-4 w-8 text-center font-normal">#</th>
              <th className="py-2 px-4 font-normal">मालाचे नाव</th>
              <th className="py-2 px-4 text-right font-normal">निव्वळ KG</th>
              <th className="py-2 px-4 text-right font-normal">भाव ₹</th>
              <th className="py-2 px-4 text-right font-normal">रक्कम ₹</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(bill.items || []).map((item, index) => {
              let bagsArr: number[] = [];
              if (Array.isArray(item.bagWeights)) {
                bagsArr = item.bagWeights.map(Number).filter((w) => !isNaN(w));
              } else if (typeof item.bagWeights === "string") {
                try {
                  const parsed = JSON.parse(item.bagWeights);
                  if (Array.isArray(parsed)) bagsArr = parsed.map(Number);
                } catch {
                  bagsArr = [];
                }
              }
              const sumBags = bagsArr.reduce((a, b) => a + b, 0);
              const bagsStr = bagsArr.length > 0 ? `${bagsArr.join("+")} = ${sumBags}` : "";
              const cutVal = Number(item.cutKg) || 0;

              return (
                <tr key={item.id || index} className="align-top">
                  <td className="py-2.5 px-4 text-center text-stone-400 font-mono text-xs">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-stone-900">
                    <div>
                      {item.productName}
                      {item.grade && (
                        <span className="font-normal text-stone-600 ml-1">
                          ({item.grade})
                        </span>
                      )}
                    </div>
                    {bagsStr && (
                      <div className="text-[11px] font-mono text-stone-500 mt-0.5 font-normal">
                        {bagsStr}
                      </div>
                    )}
                    {cutVal > 0 && (
                      <div className="text-[11px] font-mono text-stone-500 mt-0.5 font-normal">
                        कट - {cutVal}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-stone-800">
                    {Number(item.netKg) % 1 === 0 ? Number(item.netKg) : Number(item.netKg).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-stone-800">
                    {Number(item.ratePerKg) % 1 === 0 ? Number(item.ratePerKg) : Number(item.ratePerKg).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-900">
                    {Math.round(Number(item.totalAmount)).toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="px-6 py-4 border-t border-stone-200">
        <div className="flex flex-col items-end space-y-1.5 text-xs sm:text-sm">
          <div className="flex justify-between w-64 text-stone-600">
            <span>एकूण वजन (निव्वळ)</span>
            <span className="font-mono font-medium">{totalNetKg % 1 === 0 ? totalNetKg : totalNetKg.toFixed(2)} KG</span>
          </div>

          <div className="flex justify-between w-64 text-stone-600">
            <span>एकूण</span>
            <span className="font-mono font-medium">₹{Math.round(itemsTotal).toLocaleString("en-IN")}</span>
          </div>

          {hamali > 0 && (
            <div className="flex justify-between w-64 text-stone-600">
              <span>हमाली वजावट</span>
              <span className="font-mono text-red-600 font-medium">- ₹{Math.round(hamali).toLocaleString("en-IN")}</span>
            </div>
          )}

          <div className="flex justify-between w-64 pt-2 border-t border-stone-200 text-stone-900 font-bold text-base">
            <span>{isPurchase ? "निव्वळ देय" : "निव्वळ देय"}</span>
            <span className="font-mono">₹{Math.round(netPayable).toLocaleString("en-IN")}</span>
          </div>

          <div className="flex justify-between w-64 text-stone-600 text-xs">
            <span>{isPurchase ? "दिले" : "मिळाले"}</span>
            <span className="font-mono font-medium">₹{Math.round(paidNow).toLocaleString("en-IN")}</span>
          </div>

          {/* Golden Highlight Due Box */}
          <div
            style={{ backgroundColor: "#fcedbe" }}
            className="w-full sm:w-80 mt-2 px-4 py-2.5 rounded-lg flex items-center justify-between text-stone-900 font-mono"
          >
            <span className="font-sans font-bold text-sm text-stone-800">बाकी</span>
            <span className="font-bold text-xl text-stone-900">
              ₹{Math.round(balanceDue).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Marathi Words & Terms */}
      <div className="px-6 py-3 border-t border-stone-100 text-xs text-stone-700 space-y-1">
        <div>
          अक्षरी: रुपये {marathiWords} फक्त
        </div>
        <div className="text-stone-500 text-[11px]">
          अटी: वजन व भाव {isPurchase ? "शेतकऱ्यास" : "ग्राहकास"} मान्य आहेत.
        </div>
      </div>

      {/* Signatures */}
      <div className="px-6 pt-6 pb-4 grid grid-cols-2 gap-10 text-xs text-stone-700 text-center">
        <div>
          <div className="w-40 mx-auto border-b border-stone-300 mb-1.5" />
          <div className="font-medium">{isPurchase ? "शेतकरी सही" : "ग्राहक सही"}</div>
        </div>
        <div>
          <div className="w-40 mx-auto border-b border-stone-300 mb-1.5" />
          <div className="font-medium">चव्हाण ट्रेडर्स</div>
        </div>
      </div>

      {/* Bottom Greeting Bar */}
      <div
        style={{ backgroundColor: "#f8f7f4" }}
        className="py-2.5 text-center text-xs text-stone-600 font-medium border-t border-stone-100"
      >
        धन्यवाद! पुन्हा भेट द्या.
      </div>
    </div>
  );
}

export function MandiInvoice({ bill }: MandiInvoiceProps) {
  const isPurchase = bill.kind === "purchase";
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const itemsTotal = (bill.items || []).reduce(
    (acc, it) => acc + (Number(it.totalAmount) || 0),
    0
  );
  const hamali = Number(bill.hamali) || 0;
  const netPayable = Math.max(0, itemsTotal - hamali);
  const paidNow = Number(bill.paidNow) || 0;
  const balanceDue = netPayable - paidNow;

  const toast = useToast();

  const billPdfData: BillPdfData = {
    kind: bill.kind,
    billNo: bill.billNo,
    billDate: bill.billDate,
    partyName: bill.partyName,
    partyPhone: bill.partyPhone,
    partyVillage: bill.partyVillage,
    hamali,
    paidNow,
    totalAmount: netPayable,
    balanceDue,
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      const fileName = await downloadBillPdf(bill);
      toast.success("PDF यशस्वीरित्या डाऊनलोड झाला!", `Saved as ${fileName}`);
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("PDF डाऊनलोड करताना त्रुटी आली.", "Failed to generate PDF. Please try again.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleWhatsApp = async () => {
    setIsExportingPDF(true);
    try {
      await shareBillOnWhatsApp(bill, (mr, en) => {
        toast.info(mr, en);
      });
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("WhatsApp share error:", err);
        toast.error("WhatsApp वर पाठवताना त्रुटी आली.", "Could not open WhatsApp.");
      }
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Top Action Bar: Exactly 3 items (Back Link, Download PDF, WhatsApp) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href={isPurchase ? "/app/purchase" : "/app/sales"}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-[#8b1a2b] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isPurchase ? "खरेदी बिलांकडे परत" : "विक्री बिलांकडे परत"}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8b1a2b] text-white text-xs sm:text-sm font-semibold hover:bg-[#701522] shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="A4 PDF डाऊनलोड करा"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExportingPDF ? "PDF तयार होत आहे..." : "PDF डाऊनलोड करा (Download PDF)"}</span>
          </button>

          {/* 2. ONE Single WhatsApp Share / Send button */}
          <button
            onClick={handleWhatsApp}
            disabled={isExportingPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1f4d33] text-white text-xs sm:text-sm font-semibold hover:bg-[#163825] shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="WhatsApp वर PDF व मेसेज पाठवा"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>WhatsApp वर पाठवा (Send on WhatsApp)</span>
          </button>
        </div>
      </div>

      {/* Invoice Document Paper */}
      <MandiInvoicePaper bill={bill} />
    </div>
  );
}
