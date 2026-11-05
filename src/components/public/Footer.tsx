"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { MapPin, Phone, MessageSquare, ArrowUp } from "lucide-react";

export function Footer() {
  const { t } = useLanguage();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#1f4d33] text-[#faf8f3] border-t border-[#173b27]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#8b1a2b] text-[#f8ecc4] flex items-center justify-center font-bold text-xl">
                🌾
              </div>
              <div>
                <span className="block font-serif text-2xl font-bold text-[#f8ecc4]">
                  {t.brandName}
                </span>
                <span className="block text-[10px] tracking-widest text-[#d4ecd9] uppercase">
                  {t.brandSub}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#d4ecd9] font-serif border-l-2 border-[#d9a850] pl-3 py-1">
              {t.ownerLine}
            </p>

            <p className="text-xs text-[#d4ecd9]/80 leading-relaxed">
              {t.heroDescription}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-serif text-lg font-bold text-[#f8ecc4]">
              {t.quickLinks}
            </h4>
            <ul className="space-y-2 text-sm text-[#d4ecd9]">
              <li>
                <a href="#home" className="hover:text-white transition-colors">
                  {t.navHome}
                </a>
              </li>
              <li>
                <a href="#products" className="hover:text-white transition-colors">
                  {t.navProducts}
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  {t.navAbout}
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  {t.navContact}
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors font-bold text-[#f8ecc4]">
                  {t.loginBtn}
                </Link>
              </li>
            </ul>
          </div>

          {/* Traded Grains */}
          <div className="space-y-3">
            <h4 className="font-serif text-lg font-bold text-[#f8ecc4]">
              {t.tradingGrains}
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                "भात (Rice)",
                "सोयाबीन (Soybean)",
                "काजू बी (Cashew)",
                "शेंगा (Groundnut)",
                "नाचणी (Nachani)",
                "ज्वारी (Jowar)",
                "बाजरी (Bajra)",
                "गहू (Wheat)",
              ].map((g, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-white/10 text-[#d4ecd9] border border-white/10"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Direct Contacts */}
          <div className="space-y-3">
            <h4 className="font-serif text-lg font-bold text-[#f8ecc4]">
              {t.navContact}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#d4ecd9]">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-[#d9a850] flex-shrink-0 mt-0.5" />
                <div>
                  <a href="tel:9765941078" className="hover:underline font-bold text-white">
                    9765941078
                  </a>
                  <span className="block text-[11px] text-[#d4ecd9]/70">साहिल चव्हाण</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-[#8fd6a8] flex-shrink-0 mt-0.5" />
                <div>
                  <a
                    href="https://wa.me/919850815527"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline font-bold text-white"
                  >
                    9850815527
                  </a>
                  <span className="block text-[11px] text-[#d4ecd9]/70">तन्मय चव्हाण (WhatsApp)</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#d9a850] flex-shrink-0 mt-0.5" />
                <span>{t.addressShort}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & Scroll To Top */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#d4ecd9]/70">
          <div>
            © 2026 चव्हाण ट्रेडर्स (Chavan Traders). {t.footerRights}
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <span>वर जा</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}

