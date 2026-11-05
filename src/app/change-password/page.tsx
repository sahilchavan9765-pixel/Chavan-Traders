"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { changePasswordAction } from "@/app/actions/users.actions";
import { validatePasswordStrength } from "@/lib/password-validator";
import { Lock, Check, X, ShieldAlert, KeyRound, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const strength = validatePasswordStrength(newPassword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!strength.valid) {
      setErrorMsg(strength.error || "कृपया सर्व पासवर्ड नियम पूर्ण करा.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("नवीन पासवर्ड आणि पुष्टीकरण पासवर्ड जुळत नाहीत (Passwords do not match).");
      return;
    }

    startTransition(async () => {
      try {
        await changePasswordAction(currentPassword, newPassword);
        setSuccessMsg("पासवर्ड यशस्वीरित्या बदलला! कृपया नवीन पासवर्डने पुन्हा लॉगिन करा.");
        setTimeout(async () => {
          await signOut({ redirect: false });
          router.push("/login?changed=true");
        }, 1500);
      } catch (err: any) {
        setErrorMsg(err.message || "पासवर्ड बदलताना अडचण आली.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] dark:bg-stone-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#8b1a2b] text-white flex items-center justify-center shadow-md">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
          पासवर्ड बदलणे आवश्यक आहे
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
          सुरक्षिततेसाठी कृपया नवीन मजबूत पासवर्ड सेट करा (Password Change Required).
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-stone-900 py-8 px-6 shadow-xl border border-stone-200 dark:border-stone-800 rounded-3xl sm:px-10 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                सध्याचा पासवर्ड (Current Password) *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="सध्याचा पासवर्ड प्रविष्ट करा"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm focus:ring-2 focus:ring-[#8b1a2b] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                नवीन पासवर्ड (New Password) *
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="नवीन मजबूत पासवर्ड"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm focus:ring-2 focus:ring-[#8b1a2b] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Live Password Strength Checklist */}
            <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5 text-[11px]">
              <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                पासवर्डचे नियम (Password Requirements):
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center gap-1.5 ${strength.checks.length ? "text-green-600 font-semibold" : "text-stone-400"}`}>
                  {strength.checks.length ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>किमान १० अक्षरे (10+ chars)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${strength.checks.uppercase ? "text-green-600 font-semibold" : "text-stone-400"}`}>
                  {strength.checks.uppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>मोठे अक्षर (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${strength.checks.lowercase ? "text-green-600 font-semibold" : "text-stone-400"}`}>
                  {strength.checks.lowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>लहान अक्षर (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${strength.checks.number ? "text-green-600 font-semibold" : "text-stone-400"}`}>
                  {strength.checks.number ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>एक अंक (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${strength.checks.symbol ? "text-green-600 font-semibold" : "text-stone-400"}`}>
                  {strength.checks.symbol ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>विशेष चिन्ह (!@#$%)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${strength.checks.notCommon ? "text-green-600 font-semibold" : "text-stone-400"}`}>
                  {strength.checks.notCommon ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>सामान्य नसलेला</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                पासवर्ड पुन्हा प्रविष्ट करा (Confirm New Password) *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="नवीन पासवर्ड पुन्हा टाका"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-sm focus:ring-2 focus:ring-[#8b1a2b]"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !strength.valid}
              className="w-full py-3.5 rounded-xl bg-[#8b1a2b] text-white font-bold text-sm shadow hover:bg-[#6d1320] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isPending ? "पासवर्ड बदलत आहे..." : "नवीन पासवर्ड जतन करा (Save Password)"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

