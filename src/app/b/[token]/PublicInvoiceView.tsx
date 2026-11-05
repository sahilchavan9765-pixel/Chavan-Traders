"use client";

import { useState } from "react";
import { MandiInvoicePaper } from "@/components/invoice/MandiInvoice";
import { generateInvoicePdf } from "@/lib/pdf-generator";
import { Download, AlertCircle, Phone, Loader2 } from "lucide-react";

export function PublicInvoiceView({ bill }: { bill: any }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { pdf, fileName } = await generateInvoicePdf(bill);
      pdf.save(fileName);
    } catch (err) {
      console.error("Public PDF download error:", err);
      alert("PDF डाऊनलोड करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Public Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] shadow-sm">
          <div>
            <div className="font-serif text-xl font-bold text-[#8b1a2b] dark:text-[#f8ecc4]">
              चव्हाण ट्रेडर्स | Chavan Traders
            </div>
            <div className="text-xs text-[var(--muted)] mt-0.5">
              अधिकृत डिजिटल पावती (Official Digital Invoice)
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#8b1a2b] hover:bg-[#701522] text-white text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloading ? "PDF तयार होत आहे..." : "PDF डाऊनलोड करा (Download PDF)"}</span>
          </button>
        </div>

        {/* Invoice Paper */}
        <MandiInvoicePaper bill={bill} />

        {/* Contact Footer */}
        <div className="text-center text-xs text-[var(--muted)] py-4 space-y-1">
          <div>काही अडचण असल्यास संपर्क साधा:</div>
          <div className="font-semibold text-[var(--foreground)] flex items-center justify-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[#1f4d33] dark:text-emerald-400" />
            <span>9765941078 / 9850815527</span>
          </div>
        </div>
      </div>
    </div>
  );
}

