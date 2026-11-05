"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getCallsAction,
  createCallAction,
  toggleCallStatusAction,
  deleteCallAction,
  restoreCallAction,
} from "@/app/actions/calls.actions";
import { formatWhatsAppPhone, formatWeight, formatDateDDMMYYYY } from "@/lib/calculations";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  PhoneCall,
  Plus,
  Trash2,
  Share2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingCart,
  RotateCcw,
  Search,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function CallsPage() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const { user, isAdmin } = useUser();
  const { lang } = useLanguage();

  // Form State
  const [callerName, setCallerName] = useState("");
  const [phone, setPhone] = useState("");
  const [product, setProduct] = useState("भात");
  const [quantityKg, setQuantityKg] = useState("");
  const [location, setLocation] = useState("");
  const [followUpDate, setFollowUpDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  const [callsList, setCallsList] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const loadData = async () => {
    try {
      const data = await getCallsAction(showDeleted && isAdmin);
      setCallsList(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [showDeleted, isAdmin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!callerName.trim()) {
      setErrorMsg("कृपया कॉलरचे नाव प्रविष्ट करा.");
      return;
    }

    startTransition(async () => {
      try {
        await createCallAction({
          callerName,
          phone,
          product,
          quantityKg: Number(quantityKg) || 0,
          location,
          followUpDate,
          notes,
        });

        toast.success(
          "कॉल नोंद यशस्वीरित्या झाली!",
          `Call logged for ${callerName}`
        );

        setCallerName("");
        setPhone("");
        setQuantityKg("");
        setLocation("");
        setNotes("");
        loadData();
      } catch (err: any) {
        setErrorMsg(err.message || "कॉल सेव्ह करताना त्रुटी आली.");
        toast.error("कॉल नोंद करताना त्रुटी आली.", err.message);
      }
    });
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "completed" : "pending";
    try {
      await toggleCallStatusAction(id, newStatus);
      toast.success(newStatus === "completed" ? "कॉल पूर्ण चिन्हांकित केला." : "कॉल प्रलंबित चिन्हांकित केला.");
      loadData();
    } catch (err: any) {
      toast.error("स्थिती बदलता आली नाही.", err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionInProgress(true);
    try {
      await deleteCallAction(deleteTarget.id);
      toast.success("कॉल नोंद हटवली गेली.", "Call record soft-deleted.");
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error("कॉल डिलीट करता आला नाही.", err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setActionInProgress(true);
    try {
      await restoreCallAction(restoreTarget.id);
      toast.success("कॉल नोंद पूर्ववत केली गेली!", "Call record restored.");
      setRestoreTarget(null);
      loadData();
    } catch (err: any) {
      toast.error("कॉल रिस्टोअर करता आला नाही.", err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleWhatsApp = (c: any) => {
    const waPhone = c.phone ? formatWhatsAppPhone(c.phone) : "";
    const text = `नमस्कार ${c.callerName} जी, चव्हाण ट्रेडर्सकडून संपर्क करत आहोत. आपल्याकडील ${c.product} बाबत चर्चा करण्यासाठी हा मेसेज केला आहे.`;
    const url = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const filteredCalls = callsList.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.callerName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.product && c.product.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        titleMr="हा कॉल रिमाइंड हटवायचा आहे का?"
        titleEn="Delete this call record?"
        messageMr={`तुम्हाला ${deleteTarget?.name} यांची कॉल नोंद हटवायची आहे का? हे सॉफ्ट-डिलीट केले जाईल आणि ॲडमिनद्वारे पुन्हा पूर्ववत केले जाऊ शकते.`}
        messageEn="This call entry will be soft-deleted and can be restored by the admin."
        confirmLabelMr="हटवा (Delete)"
        confirmLabelEn="Delete"
        requireReason={false}
        isDestructive={true}
        isPending={actionInProgress}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!restoreTarget}
        titleMr="हा कॉल रिमाइंड पूर्ववत करायचा आहे का?"
        titleEn="Restore this call record?"
        messageMr={`कॉल पूर्ववत केल्यास तो पुन्हा चालू कॉल यादीत समाविष्ट होईल.`}
        messageEn="Restoring will return this call reminder to the active list."
        confirmLabelMr="पूर्ववत करा (Restore)"
        confirmLabelEn="Restore"
        requireReason={false}
        isDestructive={false}
        isPending={actionInProgress}
        onConfirm={handleConfirmRestore}
        onClose={() => setRestoreTarget(null)}
      />

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1f4d33] dark:text-[#a3b899] flex items-center gap-2.5">
            <PhoneCall className="w-7 h-7" />
            <span>कॉल नोंदणी व रिमाइंडर्स (Call Register & Reminders)</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            शेतकरी व व्यापाऱ्यांचे चौकशी कॉल्स, मालाची उपलब्धता आणि फॉलो-अप व्यवस्थापन.
          </p>
        </div>

        {/* Admin Deleted Toggle */}
        {isAdmin && (
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors w-fit">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded text-[#1f4d33] focus:ring-[#1f4d33]"
            />
            <span>रद्द केलेले कॉल्स (Show Deleted)</span>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Container */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm h-fit">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <Plus className="w-4 h-4 text-[#1f4d33]" />
              <span>कॉल नोंद करा (Log a Call)</span>
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                कॉलरचे नाव (Caller Name) *
              </label>
              <input
                type="text"
                placeholder="उदा. सुरेश शिंदे"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  मोबाईल क्र. (Mobile - १० अंक)
                </label>
                {phone && (
                  <span
                    className={`text-[11px] font-mono ${
                      phone.length === 10
                        ? "text-green-600 font-bold"
                        : "text-amber-600"
                    }`}
                  >
                    {phone.length}/10
                  </span>
                )}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="१० अंकी मोबाईल क्र. (उदा. 9890123456)"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  माल (Product)
                </label>
                <input
                  type="text"
                  placeholder="उदा. भात, सोयाबीन"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  अंदाजे वजन (KG)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="उदा. 2000"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                गाव / ठिकाण (Location)
              </label>
              <input
                type="text"
                placeholder="उदा. आजरा, उत्तूर, गडहिंग्लज"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
              />
            </div>

            <div>
              <DatePicker
                label={lang === "mr" ? "फॉलो-अप तारीख" : "Follow-up Date"}
                value={followUpDate}
                onChange={setFollowUpDate}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                टीप / नोंदी (Notes)
              </label>
              <textarea
                rows={2}
                placeholder="उदा. २ दिवसांनी दर सांगणे आहे, ५० पोती तयार आहेत..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-[#1f4d33] text-white font-bold text-sm shadow hover:bg-[#163825] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isPending ? "नोंद सेव्ह होत आहे..." : "कॉल नोंद सेव्ह करा"}</span>
            </button>
          </form>
        </div>

        {/* Calls List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#1f4d33]" />
              <span>प्रलंबित आणि पूर्ण कॉल्स (Call History)</span>
            </h2>

            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="नाव, मोबाईल, माल शोधा..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent focus:ring-2 focus:ring-[#1f4d33]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredCalls.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center text-stone-400">
                कोणतेही कॉल नोंदी आढळल्या नाहीत.
              </div>
            ) : (
              filteredCalls.map((c) => {
                const isPendingCall = c.status === "pending";
                const isDeleted = !!c.isDeleted;

                return (
                  <div
                    key={c.id}
                    className={`bg-white dark:bg-stone-900 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                      isDeleted
                        ? "border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 opacity-75"
                        : isPendingCall
                        ? "border-amber-200 dark:border-amber-900/40"
                        : "border-stone-200 dark:border-stone-800 opacity-90"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                            {c.callerName}
                          </h4>
                          {isDeleted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                              रद्द (Void)
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPendingCall
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {isPendingCall ? "प्रलंबित (Pending)" : "पूर्ण (Completed)"}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                          {c.phone && <span className="font-mono">{c.phone}</span>}
                          {c.location && <span>• {c.location}</span>}
                          {c.product && (
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              • {c.product}
                              {Number(c.quantityKg) > 0 &&
                                ` (${formatWeight(Number(c.quantityKg))})`}
                            </span>
                          )}
                        </div>

                        {c.notes && (
                          <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-xl">
                            {c.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Direct Create Purchase Shortcut */}
                        <Link
                          href={`/app/purchase?name=${encodeURIComponent(
                            c.callerName
                          )}&phone=${encodeURIComponent(c.phone || "")}`}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-[#8b1a2b] hover:text-[#8b1a2b] transition-colors"
                          title="या शेतकऱ्यासाठी खरेदी बिल बनवा"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </Link>

                        {/* WhatsApp Reply */}
                        <button
                          onClick={() => handleWhatsApp(c)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="WhatsApp मेसेज पाठवा"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Status Toggle */}
                        {!isDeleted && (
                          <button
                            onClick={() => handleToggleStatus(c.id, c.status)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isPendingCall
                                ? "bg-stone-100 text-stone-600 hover:bg-emerald-100 hover:text-emerald-700"
                                : "bg-emerald-100 text-emerald-800 hover:bg-amber-100 hover:text-amber-700"
                            }`}
                            title={isPendingCall ? "पूर्ण चिन्हांकित करा" : "प्रलंबित करा"}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Restore if Deleted */}
                        {isDeleted && isAdmin && (
                          <button
                            onClick={() => setRestoreTarget({ id: c.id, name: c.callerName })}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                            title="कॉल पूर्ववत करा"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        {!isDeleted && (
                          <button
                            onClick={() => setDeleteTarget({ id: c.id, name: c.callerName })}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="कॉल डिलीट करा"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
