"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { HeartHandshake, CheckCircle2 } from "lucide-react";

export function AboutSection() {
  const { locale, t } = useLanguage();

  return (
    <section id="about" className="scroll-mt-24 py-16 sm:py-24 bg-[#faf8f3] dark:bg-[#14201a] border-b border-[#ddd8cc] dark:border-[#34453b] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Main narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-xs font-bold tracking-widest text-[#1f4d33] dark:text-[#8fd6a8] uppercase">
                {locale === "mr" ? "आमचा वारसा व निष्ठा" : "Heritage & Trust"}
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#8b1a2b] dark:text-[#e8909e] mt-1 mb-4">
                {t.aboutHeading}
              </h2>
              <div className="w-16 h-1 bg-[#1f4d33] dark:bg-[#8fd6a8] rounded-full" />
            </div>

            <p className="text-base sm:text-lg text-[#1d1d1b] dark:text-[#eee9de] leading-relaxed">
              {t.aboutText1}
            </p>

            <p className="text-base sm:text-lg text-[#6b685f] dark:text-[#a9b4ac] leading-relaxed">
              {t.aboutText2}
            </p>

            {/* Quick check points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                locale === "mr" ? "काट्यावर पारदर्शक वजन" : "Computerized Certified Weighing",
                locale === "mr" ? "हंगामानुसार रोख चुकता" : "Direct On-Time Settlement",
                locale === "mr" ? "मोठ्या बाजारपेठांशी थेट जोडणी" : "Direct Mill & Wholesale Connect",
                locale === "mr" ? "सर्व प्रकारच्या कडधान्यांची खरेदी" : "All Grains & Pulses Procured",
              ].map((pt, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#1f4d33] dark:text-[#8fd6a8] flex-shrink-0" />
                  <span className="text-sm font-semibold text-[#1d1d1b] dark:text-[#eee9de]">{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Side card / stats badge */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-[#1f4d33] to-[#122e1f] text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-10 text-9xl">🌾</div>

              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <HeartHandshake className="w-8 h-8 text-[#8fd6a8]" />
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-bold mb-3">
                {locale === "mr" ? "शेतकऱ्यांचा विश्वास, आमची ताकद" : "Farmers' Trust, Our Strength"}
              </h3>

              <p className="text-[#d4ecd9] text-sm sm:text-base leading-relaxed mb-6">
                {locale === "mr"
                  ? "गेल्या अनेक वर्षांपासून आजरा, चंदगड, गडहिंग्लज आणि कोकण परिसरातील शेकडो शेतकरी बांधव चव्हाण ट्रेडर्सवर पूर्ण विश्वास ठेवून आपला माल विकत आहेत."
                  : "Serving hundreds of farmer families across Ajra, Chandgad, Gadhinglaj, and Konkan with guaranteed fair trading practices."}
              </p>

              <div className="pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
                <div>
                  <div className="font-serif text-3xl font-extrabold text-[#f8ecc4]">100%</div>
                  <div className="text-xs text-[#d4ecd9] mt-0.5">{locale === "mr" ? "पारदर्शक व्यवहार" : "Transparent Weighing"}</div>
                </div>
                <div>
                  <div className="font-serif text-3xl font-extrabold text-[#f8ecc4]">6+</div>
                  <div className="text-xs text-[#d4ecd9] mt-0.5">{locale === "mr" ? "प्रमुख धान्य पिके" : "Primary Crops"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
