"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  messageMr: string;
  messageEn?: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (messageMr: string, messageEn?: string, type?: ToastType) => void;
  success: (messageMr: string, messageEn?: string) => void;
  error: (messageMr: string, messageEn?: string) => void;
  info: (messageMr: string, messageEn?: string) => void;
  warning: (messageMr: string, messageEn?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (messageMr: string, messageEn?: string, type: ToastType = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { id, messageMr, messageEn, type }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  const success = useCallback(
    (messageMr: string, messageEn?: string) => showToast(messageMr, messageEn, "success"),
    [showToast]
  );

  const error = useCallback(
    (messageMr: string, messageEn?: string) => showToast(messageMr, messageEn, "error"),
    [showToast]
  );

  const info = useCallback(
    (messageMr: string, messageEn?: string) => showToast(messageMr, messageEn, "info"),
    [showToast]
  );

  const warning = useCallback(
    (messageMr: string, messageEn?: string) => showToast(messageMr, messageEn, "warning"),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border backdrop-blur flex items-start justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 transition-all ${
              t.type === "success"
                ? "bg-[#1f4d33] text-white border-emerald-600/40"
                : t.type === "error"
                ? "bg-[#8b1a2b] text-white border-red-700/50"
                : "bg-stone-900 text-stone-100 border-stone-700"
            }`}
          >
            <div className="flex items-start gap-2.5 flex-1">
              {t.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              ) : t.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-red-200 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 text-xs sm:text-sm">
                <div className="font-semibold leading-snug">{t.messageMr}</div>
                {t.messageEn && (
                  <div className="text-[11px] opacity-80 font-normal">{t.messageEn}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider
    return {
      showToast: (mr: string, en?: string) => console.log(mr, en),
      success: (mr: string, en?: string) => console.log(mr, en),
      error: (mr: string, en?: string) => console.error(mr, en),
      info: (mr: string, en?: string) => console.info(mr, en),
      warning: (mr: string, en?: string) => console.warn(mr, en),
    };
  }
  return ctx;
}

