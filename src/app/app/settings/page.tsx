"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getSettingsAction,
  updateBusinessProfileAction,
  changePasswordAction,
  exportBackupAction,
  importOldCt1Action,
  runDataHealthCheckAction,
  clearTestDataAction,
  previewTestDataAction,
  getAuditLogsAction,
  type HealthCheckResult,
} from "@/app/actions/settings.actions";
import {
  getPartiesAction,
  mergePartiesAction,
} from "@/app/actions/bills.actions";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Settings,
  Shield,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Building,
  Key,
  Database,
  Activity,
  Users2,
  ArrowRight,
  RefreshCw,
  Clock,
  Eye,
  Loader2,
} from "lucide-react";

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const { user, isAdmin } = useUser();

  // Profile State
  const [profile, setProfile] = useState<any>({
    firmNameMr: "चव्हाण ट्रेडर्स",
    firmNameEn: "Chavan Traders",
    ownerTribute: "कै. श्री. रमेश कृष्णा चव्हाण",
    phone1: "9765941078",
    phone1Name: "साहिल चव्हाण",
    phone2: "9850815527",
    phone2Name: "तन्मय चव्हाण",
    addressMr: "मु.पो. उत्तूर, तळेगळ्ळी, ता. आजरा, जि. कोल्हापूर",
    pSeriesNext: 3,
    sSeriesNext: 2,
  });

  // Password State
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // Migration State
  const [importJson, setImportJson] = useState("");
  const [importSummary, setImportSummary] = useState<any>(null);

  // Health Check State
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Merge Parties State
  const [partiesList, setPartiesList] = useState<any[]>([]);
  const [sourcePartyId, setSourcePartyId] = useState("");
  const [targetPartyId, setTargetPartyId] = useState("");
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Clear Test Data State
  const [clearPhrase, setClearPhrase] = useState("");
  const [isClearingTest, setIsClearingTest] = useState(false);
  const [testDataPreview, setTestDataPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Audit Log State
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingAuditLog, setIsLoadingAuditLog] = useState(false);
  const [auditLogVisible, setAuditLogVisible] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getSettingsAction().then((data) => {
      if (data) setProfile(data);
    });
    getPartiesAction().then((data) => {
      if (data) setPartiesList(data);
    });
  }, []);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    startTransition(async () => {
      try {
        await updateBusinessProfileAction(profile);
        setFeedbackMsg({ type: "success", text: "फर्म माहिती यशस्वीरीत्या अपडेट केली!" });
        toast.success("फर्म माहिती यशस्वीरीत्या सेव्ह झाली!");
      } catch (err: any) {
        setFeedbackMsg({ type: "error", text: err.message || "अपडेट करताना त्रुटी आली." });
        toast.error("अपडेट करताना त्रुटी आली.", err.message);
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (newPass !== confirmPass) {
      setFeedbackMsg({ type: "error", text: "नवीन पासवर्ड जुळत नाही." });
      toast.error("नवीन पासवर्ड जुळत नाही.");
      return;
    }

    startTransition(async () => {
      try {
        await changePasswordAction(currentPass, newPass);
        setFeedbackMsg({ type: "success", text: "पासवर्ड यशस्वीरीत्या बदलला गेला!" });
        toast.success("पासवर्ड यशस्वीरीत्या बदलला गेला!");
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
      } catch (err: any) {
        setFeedbackMsg({ type: "error", text: err.message || "पासवर्ड बदलताना त्रुटी आली." });
        toast.error("पासवर्ड बदलताना त्रुटी आली.", err.message);
      }
    });
  };

  const handleDownloadBackup = async () => {
    try {
      const backup = await exportBackupAction();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chavan-traders-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("डेटा बॅकअप डाऊनलोड झाला!");
    } catch (err: any) {
      toast.error("बॅकअप डाऊनलोड करताना त्रुटी आली.", err.message);
    }
  };

  const handleImportCt1 = () => {
    setFeedbackMsg(null);
    try {
      const parsed = JSON.parse(importJson);
      startTransition(async () => {
        const res = await importOldCt1Action(parsed);
        if (res.success) {
          setImportSummary(res);
          setFeedbackMsg({
            type: "success",
            text: `जुना डेटा यशस्वीरीत्या इम्पोर्ट झाला! (बिले: ${res.importedBills}, पेमेंट्स: ${res.importedPayments}, कॉल्स: ${res.importedCalls})`,
          });
          toast.success("जुना डेटा यशस्वीरीत्या इम्पोर्ट झाला!");
          setImportJson("");
        }
      });
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: "कृपया वैध JSON पेस्ट करा." });
      toast.error("कृपया वैध JSON पेस्ट करा.");
    }
  };

  // Run Data Health Check
  const handleRunHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const result = await runDataHealthCheckAction();
      setHealthResult(result);
      if (result.allMatch) {
        toast.success("सर्व रेकॉर्ड्स परिपूर्ण जुळत आहेत! (All Records Match)");
      } else {
        toast.warning(`${result.totalChecks - result.passedChecks} पडताळणीमध्ये विसंगती आढळली.`);
      }
    } catch (err: any) {
      toast.error("डेटा तपासणी करताना त्रुटी आली.", err.message);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Merge Parties
  const handleConfirmMerge = async () => {
    if (!sourcePartyId || !targetPartyId) return;
    setIsMerging(true);
    try {
      await mergePartiesAction(sourcePartyId, targetPartyId);
      toast.success("पार्टी यशस्वीरीत्या विलीन करण्यात आली!");
      setIsMergeModalOpen(false);
      setSourcePartyId("");
      setTargetPartyId("");
      // Refresh parties
      const updated = await getPartiesAction();
      setPartiesList(updated);
    } catch (err: any) {
      toast.error("पार्टी विलीन करताना त्रुटी आली.", err.message);
    } finally {
      setIsMerging(false);
    }
  };

  const handleClearTestData = async () => {
    if (clearPhrase !== "CLEAR TEST DATA") {
      toast.error("पुष्टीकरण वाक्य जुळत नाही.", "Please type 'CLEAR TEST DATA' in capital letters.");
      return;
    }
    setIsClearingTest(true);
    try {
      const res = await clearTestDataAction(clearPhrase);
      toast.success(
        "चाचणी डेटा यशस्वीरित्या साफ झाला!",
        `${res.clearedCount} चाचणी बिले रद्द करण्यात आली व बिल काउंटर पूर्ववत केले.`
      );
      setClearPhrase("");
      setTestDataPreview(null);
      // Reload profile
      const prof = await getSettingsAction();
      if (prof) setProfile(prof);
    } catch (err: any) {
      toast.error("डेटा साफ करताना त्रुटी आली.", err.message || "Failed to clear test data");
    } finally {
      setIsClearingTest(false);
    }
  };

  const handlePreviewTestData = async () => {
    setIsLoadingPreview(true);
    try {
      const preview = await previewTestDataAction();
      setTestDataPreview(preview);
    } catch (err: any) {
      toast.error("प्रिव्ह्यू लोड करताना त्रुटी आली.", err.message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleLoadAuditLog = async () => {
    setIsLoadingAuditLog(true);
    setAuditLogVisible(true);
    try {
      const logs = await getAuditLogsAction(100);
      setActivityLogs(logs);
    } catch (err: any) {
      toast.error("Activity log लोड करताना त्रुटी आली.", err.message);
    } finally {
      setIsLoadingAuditLog(false);
    }
  };

  const sourceParty = partiesList.find((p) => p.id === sourcePartyId);
  const targetParty = partiesList.find((p) => p.id === targetPartyId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Confirmation Dialog for Merging Parties */}
      <ConfirmDialog
        isOpen={isMergeModalOpen}
        titleMr="पार्टी खाती विलीन करायची आहेत का?"
        titleEn="Merge duplicate party accounts?"
        messageMr={`तुम्हाला खात्री आहे का की "${sourceParty?.name}" चे सर्व बिले, पेमेंट्स आणि कॉल्स "${targetParty?.name}" यांच्या खात्यात हस्तांतरित करायचे आहेत? ही क्रिया अपरिवर्तनीय आहे.`}
        messageEn={`All bills, payments, and calls of "${sourceParty?.name}" will be merged into "${targetParty?.name}".`}
        confirmLabelMr="विलीन करा (Merge Parties)"
        confirmLabelEn="Confirm Merge"
        requireReason={false}
        isDestructive={false}
        isPending={isMerging}
        onConfirm={handleConfirmMerge}
        onClose={() => setIsMergeModalOpen(false)}
      />

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#8b1a2b] dark:text-[#f8ecc4] flex items-center gap-2.5">
            <Settings className="w-7 h-7" />
            <span>सेटिंग्ज, सुरक्षा आणि बॅकअप (Settings)</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            फर्म तपशील, बिल नंबर मालिका, डेटा पडताळणी, पार्टी विलीनीकरण, पासवर्ड आणि बॅकअप.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            feedbackMsg.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ADMIN DATA HEALTH CHECK SECTION */}
      {isAdmin && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>डेटा ताळमेळ व पडताळणी (Data Health Check)</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                खरेदी, विक्री, जमा-खर्च वही, शेतकरी शिल्लक आणि स्टॉक यांच्या अचूकतेची थेट पडताळणी करा.
              </p>
            </div>

            <button
              onClick={handleRunHealthCheck}
              disabled={isCheckingHealth}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingHealth ? "animate-spin" : ""}`} />
              <span>{isCheckingHealth ? "पडताळणी सुरू आहे..." : "डेटा पडताळणी सुरू करा (Run Health Check)"}</span>
            </button>
          </div>

          {healthResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  healthResult.allMatch
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    className={`w-6 h-6 ${
                      healthResult.allMatch ? "text-emerald-600" : "text-amber-600"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-sm">
                      {healthResult.allMatch
                        ? "सर्व नोंदी परिपूर्ण जुळत आहेत! (All Records Match)"
                        : "डेटा तपासणी पूर्ण झाली (काही सूचना आढळल्या)"}
                    </div>
                    <div className="text-xs opacity-80">
                      {healthResult.passedChecks} पैकी {healthResult.totalChecks} निकष उत्तीर्ण • तपासणी वेळ: {healthResult.checkedAt}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    healthResult.allMatch
                      ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                      : "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                  }`}
                >
                  {healthResult.allMatch ? "100% HEALTHY" : "REVIEW NEEDED"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {healthResult.checks.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                        {c.nameMr}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === "ok"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {c.status === "ok" ? "OK" : "CHECK"}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">
                      {c.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN PARTY MERGE TOOL SECTION */}
      {isAdmin && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
            <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Users2 className="w-5 h-5 text-indigo-600" />
              <span>पार्टी खाती एकत्र / विलीन करा (Merge Duplicate Parties)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              एकाच व्यक्तीची स्पेलिंग किंवा नावाच्या फरकामुळे दोन खाती झाली असल्यास त्यांना एका खात्यात सुरक्षितपणे विलीन करा.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                जुन्या / डुप्लिकेट पार्टीचे नाव (Source Party - हे खाते हटवले जाईल):
              </label>
              <select
                value={sourcePartyId}
                onChange={(e) => setSourcePartyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              >
                <option value="">-- जुनी पार्टी निवडा --</option>
                {partiesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.village ? `(${p.village})` : ""} {p.phone ? `• ${p.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                मुख्य पार्टीचे नाव (Target Party - यामध्ये सर्व व्यवहार जमा होतील):
              </label>
              <select
                value={targetPartyId}
                onChange={(e) => setTargetPartyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              >
                <option value="">-- मुख्य पार्टी निवडा --</option>
                {partiesList
                  .filter((p) => p.id !== sourcePartyId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.village ? `(${p.village})` : ""} {p.phone ? `• ${p.phone}` : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(true)}
                disabled={!sourcePartyId || !targetPartyId || sourcePartyId === targetPartyId}
                className="w-full py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                विलीन करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. Business Profile Form */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <Building className="w-5 h-5 text-[#8b1a2b]" />
            <span>फर्म माहिती आणि बिल नंबरिंग (Business Profile)</span>
          </h2>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                फर्मचे नाव (मराठी)
              </label>
              <input
                type="text"
                value={profile.firmNameMr || ""}
                onChange={(e) => setProfile({ ...profile, firmNameMr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                आदरणीय स्मृती (Owner Tribute)
              </label>
              <input
                type="text"
                value={profile.ownerTribute || ""}
                onChange={(e) => setProfile({ ...profile, ownerTribute: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  मोबाईल १ (साहिल चव्हाण)
                </label>
                <input
                  type="text"
                  value={profile.phone1 || ""}
                  onChange={(e) => setProfile({ ...profile, phone1: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  मोबाईल २ (तन्मय चव्हाण)
                </label>
                <input
                  type="text"
                  value={profile.phone2 || ""}
                  onChange={(e) => setProfile({ ...profile, phone2: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                पत्ता (Address)
              </label>
              <input
                type="text"
                value={profile.addressMr || ""}
                onChange={(e) => setProfile({ ...profile, addressMr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  पुढील खरेदी बिल क्र. (P-Series)
                </label>
                <input
                  type="number"
                  min="1"
                  value={profile.pSeriesNext || 1}
                  onChange={(e) =>
                    setProfile({ ...profile, pSeriesNext: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  पुढील विक्री बिल क्र. (S-Series)
                </label>
                <input
                  type="number"
                  min="1"
                  value={profile.sSeriesNext || 1}
                  onChange={(e) =>
                    setProfile({ ...profile, sSeriesNext: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-[#8b1a2b] text-white font-bold text-sm shadow hover:bg-[#6d1320] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isPending ? "अपडेट होत आहे..." : "माहिती सेव्ह करा"}</span>
            </button>
          </form>
        </div>

        {/* 2. Password Change Form */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <Key className="w-5 h-5 text-amber-600" />
            <span>पासवर्ड बदला (Change Password)</span>
          </h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                सध्याचा पासवर्ड (Current Password) *
              </label>
              <input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                नवीन पासवर्ड (New Password - किमान ६ अक्षरे) *
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                नवीन पासवर्ड पुन्हा टाका (Confirm New Password) *
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-amber-700 text-white font-bold text-sm shadow hover:bg-amber-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isPending ? "बदलत आहे..." : "पासवर्ड अपडेट करा"}</span>
            </button>
          </form>
        </div>

        {/* 3. Full Database Backup */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <Database className="w-5 h-5 text-[#1f4d33]" />
            <span>डेटा बॅकअप डाऊनलोड (Database Backup)</span>
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            आपल्या संपूर्ण व्यापारी डेटाचा सुरक्षित JSON बॅकअप एका क्लिकवर कॉम्प्युटर किंवा मोबाईलमध्ये सेव्ह करा.
          </p>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-3 rounded-xl border-2 border-[#1f4d33] text-[#1f4d33] hover:bg-[#1f4d33] hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>संपूर्ण डेटा बॅकअप डाऊनलोड करा (JSON)</span>
          </button>
        </div>

        {/* 4. Import from Old App ct1 JSON */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <Upload className="w-5 h-5 text-indigo-600" />
            <span>जुन्या ॲपमधून डेटा इम्पोर्ट करा (Import &lsquo;ct1&rsquo;)</span>
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            जुन्या सिस्टीममधील localStorage चा &lsquo;ct1&rsquo; JSON येथे पेस्ट करून एका क्लिकवर सर्व जुनी बिले आणि पेमेंट्स मायग्रेट करा.
          </p>

          <textarea
            rows={3}
            placeholder='{"pur": [...], "sal": [...], "pay": [...], "calls": [...]}'
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-xs font-mono"
          />

          <button
            onClick={handleImportCt1}
            disabled={!importJson.trim() || isPending}
            className="w-full py-2.5 rounded-xl bg-indigo-700 text-white font-bold text-sm shadow hover:bg-indigo-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "इम्पोर्ट होत आहे..." : "जुना डेटा इम्पोर्ट करा"}
          </button>
        </div>

        {/* 5. Clear Test Data (Admin Only) */}
        {isAdmin && (
          <div className="bg-white dark:bg-stone-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-lg text-red-700 dark:text-red-400 flex items-center gap-2 border-b border-red-100 dark:border-red-950 pb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>चाचणी डेटा साफ करा (Clear Test Data)</span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              चाचणी किंवा ऑटोमेशन दरम्यान तयार झालेली तात्पुरती बिले रद्द करा आणि पुढील बिल नंबर काउंटर वास्तविक संख्येवर पूर्ववत करा. कारवाईपूर्वी स्वयंचलित सुरक्षित JSON बॅकअप घेतला जातो.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                पुष्टी करण्यासाठी <span className="font-mono text-red-600 font-bold">CLEAR TEST DATA</span> टाइप करा:
              </label>
              <input
                type="text"
                placeholder="CLEAR TEST DATA"
                value={clearPhrase}
                onChange={(e) => setClearPhrase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-red-300 dark:border-red-800 bg-transparent text-xs font-mono font-bold"
              />
            </div>

            <button
              onClick={handleClearTestData}
              disabled={clearPhrase !== "CLEAR TEST DATA" || isClearingTest}
              className="w-full py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {isClearingTest && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isClearingTest ? "साफ होत आहे..." : "चाचणी डेटा नष्ट करा (Purge Test Records)"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ADMIN ACTIVITY LOG */}
      {isAdmin && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>क्रियाकलाप नोंद (Activity Log)</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">कोणी, कधी, काय केले याची संपूर्ण नोंद.</p>
            </div>
            <button
              onClick={handleLoadAuditLog}
              disabled={isLoadingAuditLog}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Eye className={`w-4 h-4 ${isLoadingAuditLog ? "animate-pulse" : ""}`} />
              <span>{isLoadingAuditLog ? "लोड होत आहे..." : "नोंद पाहा (View Log)"}</span>
            </button>
          </div>
          {auditLogVisible && (
            <div className="max-h-96 overflow-y-auto">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-stone-500 text-center py-6">कोणत्याही नोंदी आढळल्या नाहीत.</p>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-stone-100 dark:bg-stone-800 z-10">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold text-stone-700 dark:text-stone-300">वेळ</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-stone-700 dark:text-stone-300">वापरकर्ता</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-stone-700 dark:text-stone-300">क्रिया</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-stone-700 dark:text-stone-300">तपशील</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                        <td className="px-2 py-1.5 text-stone-500 whitespace-nowrap font-mono">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-stone-700 dark:text-stone-300 max-w-[120px] truncate">{log.userEmail || "—"}</td>
                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-mono text-[10px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-stone-600 dark:text-stone-400 max-w-xs truncate">
                          {log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
