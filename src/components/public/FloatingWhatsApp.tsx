"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function FloatingWhatsApp() {
  const { locale } = useLanguage();

  const msg =
    locale === "mr"
      ? "नमस्कार चव्हाण ट्रेडर्स, मला धान्य खरेदी/विक्रीबद्दल माहिती हवी आहे."
      : "Hello Chavan Traders, I have an inquiry regarding grain purchase/sale.";

  const href = `https://wa.me/919850815527?text=${encodeURIComponent(msg)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed z-40 bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-full bg-[#1f4d33] hover:bg-[#173b27] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all group border-2 border-white/60 dark:border-white/20"
      style={{
        bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="relative">
        <MessageSquare className="w-6 h-6 text-[#8fd6a8]" />
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      </div>
      <span className="font-bold text-sm hidden sm:inline-block">
        WhatsApp
      </span>
    </a>
  );
}

