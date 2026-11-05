import { requireAuth } from "@/lib/auth-guard";
import { getBillsAction, getPartyBalancesAction } from "@/app/actions/bills.actions";
import { getCallsAction } from "@/app/actions/calls.actions";
import { getProfitReportAction } from "@/app/actions/stock.actions";
import { formatIndianCurrency, formatWeight, formatDateDDMMYYYY } from "@/lib/calculations";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  Building,
  PhoneCall,
  Plus,
  ArrowRight,
  Receipt,
  Download,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await requireAuth();

  const [allBills, partyBalances, callsList, profitData] = await Promise.all([
    getBillsAction(),
    getPartyBalancesAction(),
    getCallsAction(),
    getProfitReportAction(),
  ]);

  // Aggregate purchases and sales
  let totalPurchases = 0;
  let totalSales = 0;

  for (const b of allBills) {
    const itemsTotal = (b.items || []).reduce(
      (acc: number, it: any) => acc + (Number(it.totalAmount) || 0),
      0
    );
    const hamali = Number(b.hamali) || 0;
    const net = Math.max(0, itemsTotal - hamali);

    if (b.kind === "purchase") {
      totalPurchases += net;
    } else {
      totalSales += net;
    }
  }

  // Aggregate party dues
  let toPayFarmers = 0;
  let advanceToFarmers = 0;
  let toReceiveClients = 0;

  for (const p of partyBalances) {
    if (p.partyType === "farmer" || p.partyType === "both") {
      if (p.balance > 0) {
        toPayFarmers += p.balance;
      } else if (p.balance < 0) {
        advanceToFarmers += Math.abs(p.balance);
      }
    }
    if (p.partyType === "client") {
      if (p.balance > 0) {
        toReceiveClients += p.balance;
      }
    }
  }

  const pendingCalls = callsList.filter((c: any) => c.status === "pending");
  const recentBills = allBills.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#8b1a2b] via-[#6d1320] to-[#1f4d33] p-6 rounded-2xl text-white shadow-md">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#f8ecc4]">
            चव्हाण ट्रेडर्स | व्यापारी डॅशबोर्ड
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold mt-1">
            नमस्कार, {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 mt-1">
            उत्कृष्ट व्यापार आणि शेतकरी विश्वासाची परंपरा.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/purchase"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#8b1a2b] text-sm font-bold shadow hover:bg-stone-100 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>नवीन खरेदी (Purchase)</span>
          </Link>
          <Link
            href="/app/sales"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f8ecc4] text-[#1f4d33] text-sm font-bold shadow hover:bg-[#efd48a] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>नवीन विक्री (Sale)</span>
          </Link>
        </div>
      </div>

      {/* 6 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Total Purchases */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm hover:border-[#8b1a2b]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              एकूण खरेदी (Total Purchases)
            </span>
            <div className="p-2 rounded-lg bg-red-50 text-[#8b1a2b] dark:bg-red-950/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-2">
            {formatIndianCurrency(totalPurchases)}
          </div>
          <div className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>शेतकऱ्यांकडून खरेदी माल</span>
            <Link href="/app/purchase" className="text-[#8b1a2b] hover:underline font-semibold">
              तपशील →
            </Link>
          </div>
        </div>

        {/* 2. Total Sales */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm hover:border-[#1f4d33]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              एकूण विक्री (Total Sales)
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-[#1f4d33] dark:bg-emerald-950/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#1f4d33] dark:text-[#a3b899] mt-2">
            {formatIndianCurrency(totalSales)}
          </div>
          <div className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>व्यापारी विक्री माल</span>
            <Link href="/app/sales" className="text-[#1f4d33] hover:underline font-semibold">
              तपशील →
            </Link>
          </div>
        </div>

        {/* 3. Profit on Goods Sold (Admin only) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm hover:border-amber-400/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              विक्रीवरील नफा (Gross Profit)
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          {profitData.isStaff ? (
            <div className="text-sm text-stone-400 mt-3 italic">
              केवळ ॲडमिनसाठी उपलब्ध (Restricted)
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-2">
                {formatIndianCurrency(profitData.profit || 0)}
              </div>
              <div className="text-xs text-stone-500 mt-2">
                Σ (विक्री दर − सरासरी खरेदी दर) × विकलेले KG
              </div>
            </>
          )}
        </div>

        {/* 4. To Pay Farmers */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              शेतकऱ्यांना देणे बाकी (To Pay)
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/30">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-2">
            {formatIndianCurrency(toPayFarmers)}
          </div>
          <div className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>शेतकऱ्यांचे देय येणे</span>
            <Link href="/app/purchase" className="text-[#8b1a2b] hover:underline font-semibold">
              शेतकरी यादी →
            </Link>
          </div>
        </div>

        {/* 5. To Receive from Clients */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              व्यापाऱ्यांकडून येणे (To Receive)
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/30">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-700 dark:text-blue-400 mt-2">
            {formatIndianCurrency(toReceiveClients)}
          </div>
          <div className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>ग्राहकांकडून बाकी रक्कम</span>
            <Link href="/app/sales" className="text-blue-700 hover:underline font-semibold">
              ग्राहक यादी →
            </Link>
          </div>
        </div>

        {/* 6. Advance to Farmers */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              शेतकऱ्यांना आगाऊ रक्कम (Advance)
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/30">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#8b1a2b] dark:text-[#f8ecc4] mt-2">
            {formatIndianCurrency(advanceToFarmers)}
          </div>
          <div className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>शेतकऱ्यांना दिलेला ॲडव्हान्स</span>
            <Link href="/app/payments" className="text-[#8b1a2b] hover:underline font-semibold">
              जमा/खर्च →
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Bills & Call Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bills (2 Columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#8b1a2b]" />
              <span>अलीकडील बिले (Recent Bills)</span>
            </h2>
            <Link
              href="/app/purchase"
              className="text-xs font-semibold text-[#8b1a2b] hover:underline flex items-center gap-1"
            >
              <span>सर्व पहा</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500">
                  <th className="py-2.5 px-3">बिल क्र.</th>
                  <th className="py-2.5 px-3">प्रकार</th>
                  <th className="py-2.5 px-3">नाव</th>
                  <th className="py-2.5 px-3">तारीख</th>
                  <th className="py-2.5 px-3 text-right">एकूण देय</th>
                  <th className="py-2.5 px-3 text-center">पावती</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {recentBills.map((b: any) => {
                  const itemsSum = (b.items || []).reduce(
                    (acc: number, it: any) => acc + (Number(it.totalAmount) || 0),
                    0
                  );
                  const net = Math.max(0, itemsSum - Number(b.hamali || 0));
                  return (
                    <tr key={b.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-[#8b1a2b] dark:text-[#f8ecc4]">
                        {b.billNo}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            b.kind === "purchase"
                              ? "bg-red-50 text-[#8b1a2b] dark:bg-red-950/40"
                              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40"
                          }`}
                        >
                          {b.kind === "purchase" ? "खरेदी" : "विक्री"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-stone-900 dark:text-stone-200">
                        {b.partyName}
                      </td>
                      <td className="py-3 px-3 text-stone-500 font-mono text-xs">
                        {formatDateDDMMYYYY(b.billDate)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                        {formatIndianCurrency(net)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Link
                          href={`/app/invoice/${b.id}`}
                          className="inline-block px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-[#fad4d4] hover:text-[#8b1a2b] text-xs font-semibold transition-colors"
                        >
                          बिल पहा
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (< md) */}
          <div className="md:hidden divide-y divide-stone-100 dark:divide-stone-800">
            {recentBills.map((b: any) => {
              const itemsSum = (b.items || []).reduce(
                (acc: number, it: any) => acc + (Number(it.totalAmount) || 0),
                0
              );
              const net = Math.max(0, itemsSum - Number(b.hamali || 0));
              return (
                <div key={b.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#8b1a2b] dark:text-[#f8ecc4]">
                      {b.billNo}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.kind === "purchase"
                          ? "bg-red-50 text-[#8b1a2b] dark:bg-red-950/40"
                          : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40"
                      }`}
                    >
                      {b.kind === "purchase" ? "खरेदी" : "विक्री"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-900 dark:text-stone-200">
                      {b.partyName}
                    </span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      {formatIndianCurrency(net)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-stone-500 font-mono">
                      {formatDateDDMMYYYY(b.billDate)}
                    </span>
                    <Link
                      href={`/app/invoice/${b.id}`}
                      className="px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-[#fad4d4] hover:text-[#8b1a2b] text-xs font-semibold transition-colors"
                    >
                      बिल पहा →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Calls Widget (1 Column) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-[#1f4d33]" />
              <span>कॉल रिमाइंडर्स ({pendingCalls.length})</span>
            </h2>
            <Link
              href="/app/calls"
              className="text-xs font-semibold text-[#1f4d33] hover:underline"
            >
              + नोंद करा
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px]">
            {pendingCalls.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-sm">
                कोणतेही प्रलंबित कॉल रिमाइंडर्स नाहीत.
              </div>
            ) : (
              pendingCalls.map((c: any) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-[#1f4d33] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {c.callerName}
                      </div>
                      <div className="text-xs text-stone-500">
                        {c.location ? `${c.location} • ` : ""}
                        {c.product ? `माल: ${c.product}` : ""}
                        {Number(c.quantityKg) > 0 ? ` (${c.quantityKg} kg)` : ""}
                      </div>
                    </div>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="p-1.5 rounded-md bg-emerald-50 text-[#1f4d33] hover:bg-emerald-100 transition-colors"
                        title="कॉल करा"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {c.notes && (
                    <div className="text-[11px] text-stone-500 mt-2 bg-stone-50 dark:bg-stone-800/50 p-1.5 rounded">
                      {c.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
            <Link
              href="/app/calls"
              className="text-xs font-semibold text-[#1f4d33] hover:underline"
            >
              सर्व कॉल्स आणि फॉलो-अप व्यवस्थापित करा →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

