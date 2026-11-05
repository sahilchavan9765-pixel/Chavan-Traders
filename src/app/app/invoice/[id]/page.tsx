import { getBillByIdAction } from "@/app/actions/bills.actions";
import { MandiInvoice } from "@/components/invoice/MandiInvoice";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let bill = null;
  try {
    bill = await getBillByIdAction(id);
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Failed to fetch bill in InvoicePage:", err);
  }

  if (!bill) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl text-center space-y-4 shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
            बिल सापडले नाही (Bill Not Found)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            हे बिल अस्तित्वात नाही किंवा तात्पुरते रद्द केले गेले असावे.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Link
            href="/app/purchase"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8b1a2b] hover:bg-[#701522] text-white text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>खरेदी बिले (Purchases)</span>
          </Link>
          <Link
            href="/app/sales"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1f4d33] hover:bg-[#163825] text-white text-xs font-bold transition-all shadow-sm"
          >
            <span>विक्री बिले (Sales)</span>
          </Link>
        </div>
      </div>
    );
  }

  return <MandiInvoice bill={bill} />;
}
