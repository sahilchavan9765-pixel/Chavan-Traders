"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getUsersAction,
  createStaffUserAction,
  toggleUserStatusAction,
  adminResetPasswordAction,
} from "@/app/actions/users.actions";
import { Users, UserPlus, Shield, KeyRound, Check, AlertCircle, Loader2 } from "lucide-react";

export default function UsersPage() {
  const [isPending, startTransition] = useTransition();

  const [usersList, setUsersList] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resetTargetUser, setResetTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [newTempPass, setNewTempPass] = useState("");
  const [resetModalMsg, setResetModalMsg] = useState("");

  useEffect(() => {
    if (!resetTargetUser) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setResetTargetUser(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetTargetUser]);

  const loadData = async () => {
    try {
      const data = await getUsersAction();
      setUsersList(data);
    } catch (err: any) {
      setErrorMsg(err.message || "युजर्स लोड करताना त्रुटी आली.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      try {
        await createStaffUserAction(email, fullName, tempPassword);
        setSuccessMsg(`नवीन स्टाफ युजर (${email}) यशस्वीरीत्या तयार झाला!`);
        setEmail("");
        setFullName("");
        setTempPassword("");
        loadData();
      } catch (err: any) {
        setErrorMsg(err.message || "युजर तयार करताना त्रुटी आली.");
      }
    });
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await toggleUserStatusAction(userId, !currentActive);
      loadData();
    } catch (err: any) {
      alert(err.message || "त्रुटी आली");
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setResetModalMsg("");

    startTransition(async () => {
      try {
        await adminResetPasswordAction(resetTargetUser.id, newTempPass);
        setSuccessMsg(`${resetTargetUser.name} यांचा पासवर्ड रीसेट केला! पुढील लॉगिनला नवीन पासवर्ड विचारला जाईल.`);
        setResetTargetUser(null);
        setNewTempPass("");
        loadData();
      } catch (err: any) {
        setResetModalMsg(err.message || "पासवर्ड रीसेट करताना त्रुटी आली.");
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#8b1a2b] dark:text-[#f8ecc4] flex items-center gap-2.5">
            <Users className="w-7 h-7" />
            <span>स्टाफ युजर्स व्यवस्थापन (Staff Management)</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            ॲडमिन आणि स्टाफ खाती, परवानग्या आणि नवीन कर्मचाऱ्यांची नोंदणी.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Staff User Form */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm h-fit">
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <UserPlus className="w-4 h-4 text-[#8b1a2b]" />
              <span>नवीन स्टाफ युजर जोडा</span>
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-xs font-semibold">
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                पूर्ण नाव (Full Name) *
              </label>
              <input
                type="text"
                placeholder="उदा. राहुल जाधव"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                ईमेल (Email) *
              </label>
              <input
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                तात्पुरता पासवर्ड (Temporary Password) *
              </label>
              <input
                type="password"
                placeholder="किमान ६ अक्षरे"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                required
                minLength={6}
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                पहिल्या लॉगिनच्या वेळी पासवर्ड बदलणे बंधनकारक असेल.
              </span>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-[#8b1a2b] text-white font-bold text-sm shadow hover:bg-[#6d1320] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isPending ? "तयार होत आहे..." : "स्टाफ युजर तयार करा"}</span>
            </button>
          </form>
        </div>

        {/* Existing Users List */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#8b1a2b]" />
            <span>अधिकृत युजर्स यादी ({usersList.length})</span>
          </h2>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500">
                  <th className="py-2.5 px-3">नाव</th>
                  <th className="py-2.5 px-3">ईमेल</th>
                  <th className="py-2.5 px-3">भूमिका (Role)</th>
                  <th className="py-2.5 px-3">स्थिती</th>
                  <th className="py-2.5 px-3 text-center">कृती</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-3 font-semibold text-stone-900 dark:text-stone-100">
                      {u.fullName || "-"}
                    </td>
                    <td className="py-3 px-3 text-stone-600 dark:text-stone-300 font-mono text-xs">
                      {u.email}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-red-50 text-[#8b1a2b] border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
                            : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.isActive
                            ? "text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-300"
                            : "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300"
                        }`}
                      >
                        {u.isActive ? "सक्रिय (Active)" : "अक्षम (Disabled)"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setResetTargetUser({ id: u.id, name: u.fullName || u.email });
                            setNewTempPass("");
                            setResetModalMsg("");
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3 text-[#8b1a2b]" />
                          <span>पासवर्ड रीसेट</span>
                        </button>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                            className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 underline cursor-pointer"
                          >
                            {u.isActive ? "अक्षम करा" : "सक्रिय करा"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (< md) */}
          <div className="md:hidden divide-y divide-stone-100 dark:divide-stone-800">
            {usersList.map((u) => (
              <div key={u.id} className="py-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                      {u.fullName || "-"}
                    </div>
                    <div className="text-xs text-stone-500 font-mono">
                      {u.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === "admin"
                          ? "bg-red-50 text-[#8b1a2b] border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
                          : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                      }`}
                    >
                      {u.role}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.isActive
                          ? "text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-300"
                          : "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300"
                      }`}
                    >
                      {u.isActive ? "सक्रिय" : "अक्षम"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => {
                      setResetTargetUser({ id: u.id, name: u.fullName || u.email });
                      setNewTempPass("");
                      setResetModalMsg("");
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3 text-[#8b1a2b]" />
                    <span>पासवर्ड रीसेट</span>
                  </button>
                  {u.role !== "admin" && (
                    <button
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                      className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 underline cursor-pointer"
                    >
                      {u.isActive ? "अक्षम करा" : "सक्रिय करा"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Reset Password Modal */}
      {resetTargetUser && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setResetTargetUser(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#8b1a2b]" />
                <span>पासवर्ड रीसेट करा</span>
              </h3>
              <button
                onClick={() => setResetTargetUser(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400">
              <strong>{resetTargetUser.name}</strong> यांच्या खात्यासाठी नवीन तात्पुरता पासवर्ड सेट करा. वापरकर्त्यास पुढील लॉगिनला नवीन पासवर्ड बदलणे बंधनकारक असेल.
            </p>

            {resetModalMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetModalMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  नवीन तात्पुरता पासवर्ड (Temporary Password) *
                </label>
                <input
                  type="text"
                  value={newTempPass}
                  onChange={(e) => setNewTempPass(e.target.value)}
                  placeholder="उदा. Temp@2026Pass!"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  किमान १० अक्षरे, मोठे व लहान अक्षर, अंक आणि चिन्ह आवश्यक.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  रद्द करा (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isPending || newTempPass.length < 10}
                  className="flex-1 py-2.5 rounded-xl bg-[#8b1a2b] text-white font-bold text-xs shadow hover:bg-[#6d1320] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isPending ? "रीसेट होत आहे..." : "पासवर्ड रीसेट करा"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

