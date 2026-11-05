"use client";

import React from "react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { Phone, MessageSquare, MapPin } from "lucide-react";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section id="home" className="scroll-mt-24 relative overflow-hidden bg-gradient-to-r from-[#f8ecc4] via-[#efd48a] to-[#d9a850] dark:from-[#2a2417] dark:via-[#3d3119] dark:to-[#4e3d1d] text-[#1d1d1b] dark:text-[#eee9de] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
            {/* Owner Tribute Line */}
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/70 dark:bg-black/40 backdrop-blur-sm border border-[#8b1a2b]/30 dark:border-[#e8909e]/30 shadow-sm">
              <span className="font-serif text-base sm:text-lg font-bold text-[#8b1a2b] dark:text-[#e8909e]">
                {t.ownerLine}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#7a1224] dark:text-[#f8ecc4] leading-[1.1] tracking-tight">
              {t.heroTitle}
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl lg:text-2xl font-medium text-[#2d2218] dark:text-[#d5cbb8] max-w-2xl leading-relaxed mx-auto lg:mx-0">
              {t.heroDescription}
            </p>

            {/* Action Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <a
                href="tel:9765941078"
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white dark:bg-[#1d2b23] text-[#1d1d1b] dark:text-white font-bold text-base sm:text-lg shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all border border-[#ddd8cc] dark:border-[#34453b]"
              >
                <span className="w-8 h-8 rounded-full bg-[#8b1a2b] text-white flex items-center justify-center text-sm">
                  <Phone className="w-4 h-4" />
                </span>
                <span>9765941078</span>
                <span className="text-xs text-[#6b685f] dark:text-[#a9b4ac] font-normal">({t.sahilName})</span>
              </a>

              <a
                href="https://wa.me/919850815527?text=%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%95%E0%A4%BE%E0%A4%B0%20%E0%A4%9A%E0%A4%B5%E0%A5%8D%E0%A4%B9%E0%A4%BE%E0%A4%A3%20%E0%A4%9F%E0%A5%8D%E0%A4%B0%E0%A5%87%E0%A4%A1%E0%A4%B0%E0%A5%8D%E0%A4%B8%2C%20%E0%A4%AE%E0%A4%B2%E0%A4%BE%20%E0%A4%A7%E0%A4%BE%E0%A4%A8%E0%A5%8D%E0%A4%AF%E0%A4%BE%E0%A4%AC%E0%A4%A6%E0%A5%8D%E0%A4%A6%E0%A4%B2%20%E0%A4%AE%E0%A4%BE%E0%A4%B9%E0%A4%BF%E0%A4%A4%E0%A5%80%20%E0%A4%B9%E0%A4%B5%E0%A5%80%20%E0%A4%86%E0%A4%B9%E0%A5%87."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-[#1f4d33] hover:bg-[#173b27] text-white font-bold text-base sm:text-lg shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <span className="w-8 h-8 rounded-full bg-white/20 text-[#8fd6a8] flex items-center justify-center text-sm">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span>9850815527</span>
                <span className="text-xs text-[#8fd6a8] font-normal">({t.tanmayName})</span>
              </a>
            </div>

            {/* Address */}
            <div className="flex items-center justify-center lg:justify-start gap-2 text-sm sm:text-base font-semibold text-[#443527] dark:text-[#c4b9a3] pt-2">
              <MapPin className="w-4 h-4 text-[#8b1a2b] dark:text-[#e8909e] flex-shrink-0" />
              <span>{t.addressShort}</span>
            </div>
          </div>

          {/* Hero Image with Fade Mask */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-[480px] aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/60 dark:border-white/10">
              <Image
                src="/images/hero-grains.webp"
                alt="Rice, Soybean, Cashew, Groundnut, Nachani"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover hero-image-mask"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 text-white text-xs sm:text-sm font-semibold text-center drop-shadow-md bg-black/30 backdrop-blur-sm py-1.5 px-3 rounded-lg">
                🌾 भात · सोयाबीन · काजू बी · शेंगा · नाचणी
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

