"use client";

import { useState, useEffect } from "react";
import {
  getEnquiriesAction,
  updateEnquiryStatusAction,
  deleteEnquiryAction,
} from "@/app/actions/enquiries.actions";
import { formatWhatsAppPhone } from "@/lib/calculations";
import {
  Mail,
  PhoneCall,
  Share2,
  Trash2,
  CheckCircle2,
  Clock,
  Inbox,
  Search,
  RefreshCw,
} from "lucide-react";

export default function EnquiriesPage() {
  const [enquiriesList, setEnquiriesList] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "closed">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getEnquiriesAction();
      setEnquiriesList(data);
    } catch (err) {
      console.error("Failed to load enquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: any) => {
    try {
      await updateEnquiryStatusAction(id, newStatus);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = window.confirm(
      `नक्की '${name}' यांची चौकशी डिलीट करायची आहे का? (Are you sure you want to delete this enquiry?)`
    );
    if (!isConfirmed) return;

    try {
      await deleteEnquiryAction(id);
      setEnquiriesList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete enquiry:", err);
      alert("चौकशी डिलीट करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.");
    }
  };

  const handleWhatsApp = (e: any) => {
    const waPhone = formatWhatsAppPhone(e.phone);
    const text = `नमस्कार ${e.name} जी, चव्हाण ट्रेडर्स (उत्तूर) कडे आपण वेबसाईटवरून ${e.product} बाबत केलेल्या चौकशीबद्दल संपर्क करत आहोत. आम्ही आपल्याला कशी मदत करू शकतो?`;
    const url = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const filtered = enquiriesList.filter((e) => {
    const matchesFilter = filter === "all" ? true : e.status === filter;
    const matchesSearch =
      !search.trim() ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search) ||
      e.product.toLowerCase().includes(search.toLowerCase()) ||
      (e.message && e.message.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const newCount = enquiriesList.filter((e) => e.status === "new").length;
  const contactedCount = enquiriesList.filter((e) => e.status === "contacted").length;
  const closedCount = enquiriesList.filter((e) => e.status === "closed").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#8b1a2b] dark:text-[#f8ecc4] flex items-center gap-2.5">
            <Mail className="w-7 h-7" />
            <span>वेबसाईट चौकशी इनबॉक्स (Website Enquiries)</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            पब्लिक वेबसाईटवरून शेतकरी व ग्राहकांनी पाठवलेले संदेश, नवीन खरेदी/विक्री विचारणा.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>रिफ्रेश करा</span>
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-[#8b1a2b] text-white shadow-xs"
                : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
            }`}
          >
            सर्व ({enquiriesList.length})
          </button>
          <button
            onClick={() => setFilter("new")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === "new"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-white dark:bg-stone-800 text-red-700 dark:text-red-400 border border-stone-200 dark:border-stone-700"
            }`}
          >
            नवीन ({newCount})
          </button>
          <button
            onClick={() => setFilter("contacted")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === "contacted"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-stone-800 text-blue-700 dark:text-blue-400 border border-stone-200 dark:border-stone-700"
            }`}
          >
            संपर्क केला ({contactedCount})
          </button>
          <button
            onClick={() => setFilter("closed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === "closed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-stone-800 text-emerald-700 dark:text-emerald-400 border border-stone-200 dark:border-stone-700"
            }`}
          >
            पूर्ण / बंद ({closedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="नाव, मोबाईल, धान्य शोधा..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:ring-2 focus:ring-[#8b1a2b]"
          />
        </div>
      </div>

      {/* Enquiries List Cards */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="space-y-3.5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-stone-400 flex flex-col items-center">
              <Inbox className="w-12 h-12 mb-2 stroke-1 text-stone-300 dark:text-stone-700" />
              <span className="font-medium text-sm">कोणतीही चौकशी आढळली नाही.</span>
              <span className="text-xs text-stone-400 mt-1">
                वेबसाईटवरून नवीन मेसेज आल्यावर ते येथे आपोआप दिसतील.
              </span>
            </div>
          ) : (
            filtered.map((e) => (
              <div
                key={e.id}
                className="p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#8b1a2b]/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-stone-900 dark:text-stone-100">
                      {e.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        e.status === "new"
                          ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          : e.status === "contacted"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {e.status === "new"
                        ? "नवीन (New)"
                        : e.status === "contacted"
                        ? "संपर्क केला"
                        : "बंद (Closed)"}
                    </span>
                  </div>

                  <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono font-medium">मोबाईल: {e.phone}</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      माल: {e.product}
                    </span>
                    <span>
                      तारीख:{" "}
                      {e.createdAt
                        ? new Date(e.createdAt).toLocaleDateString("mr-IN")
                        : "आज"}
                    </span>
                  </div>

                  {e.message && (
                    <div className="text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-lg border border-stone-100 dark:border-stone-800 leading-relaxed">
                      💬 &ldquo;{e.message}&rdquo;
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                  <select
                    value={e.status}
                    onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
                    className="text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-2 bg-transparent focus:ring-2 focus:ring-[#8b1a2b]"
                  >
                    <option value="new">नवीन (New)</option>
                    <option value="contacted">संपर्क केला (Contacted)</option>
                    <option value="closed">बंद (Closed)</option>
                  </select>

                  <a
                    href={`tel:${e.phone}`}
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 transition-colors"
                    title="थेट कॉल करा"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleWhatsApp(e)}
                    className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 transition-colors cursor-pointer"
                    title="WhatsApp मेसेज पाठवा"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(e.id, e.name)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/40 dark:text-red-400 transition-colors cursor-pointer"
                    title="चौकशी डिलीट करा (Delete Enquiry)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
