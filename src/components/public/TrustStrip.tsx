"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { ShieldCheck, Scale, Users, Banknote } from "lucide-react";

export function TrustStrip() {
  const { t } = useLanguage();

  const trustItems = [
    {
      icon: ShieldCheck,
      title: t.trust1Title,
      desc: t.trust1Desc,
    },
    {
      icon: Scale,
      title: t.trust2Title,
      desc: t.trust2Desc,
    },
    {
      icon: Users,
      title: t.trust3Title,
      desc: t.trust3Desc,
    },
    {
      icon: Banknote,
      title: t.trust4Title,
      desc: t.trust4Desc,
    },
  ];

  return (
    <section className="py-12 bg-white dark:bg-[#18261e] border-b border-[#ddd8cc] dark:border-[#34453b] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-4 p-5 rounded-xl bg-[#faf8f3] dark:bg-[#1d2b23] border border-[#ddd8cc]/60 dark:border-[#34453b]/60 shadow-sm hover:border-[#8b1a2b] transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1f4d33]/10 dark:bg-[#8fd6a8]/10 text-[#1f4d33] dark:text-[#8fd6a8] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-[#8b1a2b] dark:text-[#e8909e] mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#6b685f] dark:text-[#a9b4ac] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

