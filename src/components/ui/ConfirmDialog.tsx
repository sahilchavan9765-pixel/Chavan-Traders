"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  titleMr: string;
  titleEn?: string;
  messageMr: string;
  messageEn?: string;
  confirmLabelMr?: string;
  confirmLabelEn?: string;
  cancelLabelMr?: string;
  cancelLabelEn?: string;
  requireReason?: boolean;
  isDestructive?: boolean;
  isPending?: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  titleMr,
  titleEn = "",
  messageMr,
  messageEn = "",
  confirmLabelMr = "हटवा",
  confirmLabelEn = "Delete",
  cancelLabelMr = "रद्द करा",
  cancelLabelEn = "Cancel",
  requireReason = false,
  isDestructive = true,
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPending) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1a251f] border-t sm:border border-stone-200 dark:border-[#293a2f] rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={isPending}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isDestructive
                ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              {titleMr}
            </h3>
            {titleEn && (
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                {titleEn}
              </div>
            )}
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed pt-1">
              {messageMr}
            </p>
            {messageEn && (
              <p className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                {messageEn}
              </p>
            )}
          </div>
        </div>

        {requireReason && (
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              कारण (Reason - ऐच्छिक):
            </label>
            <input
              type="text"
              placeholder="उदा. चुकीची नोंद, माल परत केला..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-[#8b1a2b]"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            {cancelLabelMr} ({cancelLabelEn})
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={`px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700 active:scale-95"
                : "bg-[#8b1a2b] hover:bg-[#701522] active:scale-95"
            }`}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>
              {isPending ? "प्रक्रिया सुरू आहे..." : `${confirmLabelMr} (${confirmLabelEn})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
