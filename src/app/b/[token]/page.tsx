import { getBillByShareTokenAction } from "@/app/actions/shares.actions";
import { PublicInvoiceView } from "./PublicInvoiceView";
import { AlertCircle, Clock, ShieldX } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "बिल पावती | Chavan Traders",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PublicBillSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getBillByShareTokenAction(token);

  if (!result || result.status === "not_found") {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)] shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold font-serif text-[var(--foreground)]">
            बिल सापडले नाही (Bill Not Found)
          </h1>
          <p className="text-xs text-[var(--muted)]">
            ही लिंक चुकीची असू शकते किंवा बिल काढून टाकण्यात आले आहे. कृपया चव्हाण ट्रेडर्सशी संपर्क साधा.
          </p>
        </div>
      </div>
    );
  }

  if (result.status === "expired") {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)] shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold font-serif text-[var(--foreground)]">
            लिंक कालबाह्य झाली आहे (Link Expired)
          </h1>
          <p className="text-xs text-[var(--muted)]">
            सुरक्षिततेसाठी ही लिंक 30 दिवसांनंतर कालबाह्य झाली आहे. नवीन लिंकसाठी कृपया 9765941078 वर कॉल किंवा WhatsApp करा.
          </p>
        </div>
      </div>
    );
  }

  if (result.status === "revoked") {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)] shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold font-serif text-[var(--foreground)]">
            लिंक रद्द करण्यात आली आहे (Link Revoked)
          </h1>
          <p className="text-xs text-[var(--muted)]">
            ही शेअर लिंक ॲडमिनद्वारे सुरक्षिततेसाठी रद्द करण्यात आली आहे.
          </p>
        </div>
      </div>
    );
  }

  return <PublicInvoiceView bill={result.bill} />;
}

