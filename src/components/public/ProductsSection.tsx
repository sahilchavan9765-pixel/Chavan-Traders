"use client";

import React from "react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowRight } from "lucide-react";

export function ProductsSection() {
  const { locale, t } = useLanguage();

  return (
    <section id="products" className="scroll-mt-24 py-16 sm:py-24 bg-[#faf8f3] dark:bg-[#14201a] border-b border-[#ddd8cc] dark:border-[#34453b] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#1f4d33] dark:text-[#8fd6a8] mb-4">
            {t.productsHeading}
          </h2>
          <div className="w-20 h-1 bg-[#8b1a2b] dark:bg-[#e8909e] mx-auto rounded-full mb-4" />
          <p className="text-base sm:text-lg text-[#6b685f] dark:text-[#a9b4ac]">
            {t.productsTagline}
          </p>
        </div>

        {/* 6 Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {t.products.map((p) => (
            <div
              key={p.id}
              className="group bg-white dark:bg-[#1d2b23] rounded-2xl overflow-hidden border border-[#ddd8cc] dark:border-[#34453b] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {/* Product Photo */}
              <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
                <Image
                  src={p.image}
                  alt={locale === "mr" ? p.mr : p.en}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3 bg-[#8b1a2b] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  {p.mr}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="font-serif text-2xl font-bold text-[#8b1a2b] dark:text-[#e8909e]">
                      {p.mr}
                    </h3>
                    <span className="text-xs font-semibold tracking-wider text-[#1f4d33] dark:text-[#8fd6a8] uppercase">
                      {p.en}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b685f] dark:text-[#a9b4ac] line-clamp-3 leading-relaxed">
                    {p.desc}
                  </p>
                </div>

                {/* Inquire link */}
                <div className="pt-5 mt-5 border-t border-[#ddd8cc]/60 dark:border-[#34453b]/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1f4d33] dark:text-[#8fd6a8]">
                    {locale === "mr" ? "खरेदी व विक्री उपलब्ध" : "Trading & Wholesale"}
                  </span>
                  <a
                    href={`#contact?product=${p.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8b1a2b] dark:text-[#e8909e] hover:underline"
                  >
                    <span>{locale === "mr" ? "चौकशी करा" : "Inquire"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

