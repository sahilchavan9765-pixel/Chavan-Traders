"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Phone, MessageSquare, MapPin, Send, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export function ContactSection() {
  const { locale, t } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    product: "",
    message: "",
    honeypot: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Basic client validation
    if (!formData.name.trim()) {
      setError(locale === "mr" ? "कृपया तुमचे नाव टाका" : "Please enter your name");
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError(
        locale === "mr"
          ? "कृपया १० अंकी योग्य मोबाईल नंबर टाका (६ ते ९ ने सुरू होणारा)"
          : "Please enter a valid 10-digit mobile number"
      );
      return;
    }
    if (!formData.product) {
      setError(locale === "mr" ? "कृपया धान्याचा प्रकार निवडा" : "Please select a commodity");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: cleanPhone,
          product: formData.product,
          message: formData.message.trim(),
          honeypot: formData.honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSuccess(true);
      setFormData({
        name: "",
        phone: "",
        product: "",
        message: "",
        honeypot: "",
      });
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to submit enquiry. Please call us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="scroll-mt-24 py-16 sm:py-24 bg-white dark:bg-[#18261e] border-b border-[#ddd8cc] dark:border-[#34453b] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#8b1a2b] dark:text-[#e8909e] mb-3">
            {t.contactHeading}
          </h2>
          <div className="w-20 h-1 bg-[#1f4d33] dark:bg-[#8fd6a8] mx-auto rounded-full mb-4" />
          <p className="text-base sm:text-lg text-[#6b685f] dark:text-[#a9b4ac]">
            {t.contactSub}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Direct Contact Cards + Map */}
          <div className="lg:col-span-5 space-y-6">
            {/* Phone Card */}
            <div className="p-6 rounded-2xl bg-[#faf8f3] dark:bg-[#1d2b23] border border-[#ddd8cc] dark:border-[#34453b] shadow-sm space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#1f4d33] dark:text-[#8fd6a8] flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#8b1a2b] dark:text-[#e8909e]" />
                <span>{t.callUs}</span>
              </h3>

              <div className="space-y-3">
                <a
                  href="tel:9765941078"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#14201a] border border-[#ddd8cc]/80 dark:border-[#34453b] hover:border-[#8b1a2b] transition-all group"
                >
                  <div>
                    <div className="font-bold text-lg text-[#8b1a2b] dark:text-[#e8909e] group-hover:underline">
                      9765941078
                    </div>
                    <div className="text-xs text-[#6b685f] dark:text-[#a9b4ac]">{t.sahilName} (कॉल)</div>
                  </div>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-[#8b1a2b]/10 text-[#8b1a2b] dark:text-[#e8909e] font-bold">
                    कॉल करा
                  </span>
                </a>

                <a
                  href="https://wa.me/919850815527?text=%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%95%E0%A4%BE%E0%A4%B0%20%E0%A4%9A%E0%A4%B5%E0%A5%8D%E0%A4%B9%E0%A4%BE%E0%A4%A3%20%E0%A4%9F%E0%A5%8D%E0%A4%B0%E0%A5%87%E0%A4%A1%E0%A4%B0%E0%A5%8D%E0%A4%B8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#14201a] border border-[#ddd8cc]/80 dark:border-[#34453b] hover:border-[#1f4d33] transition-all group"
                >
                  <div>
                    <div className="font-bold text-lg text-[#1f4d33] dark:text-[#8fd6a8] group-hover:underline">
                      9850815527
                    </div>
                    <div className="text-xs text-[#6b685f] dark:text-[#a9b4ac]">{t.tanmayName} (व्हॉट्सॲप)</div>
                  </div>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-[#1f4d33]/10 text-[#1f4d33] dark:text-[#8fd6a8] font-bold flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </span>
                </a>
              </div>
            </div>

            {/* Address Card */}
            <div className="p-6 rounded-2xl bg-[#faf8f3] dark:bg-[#1d2b23] border border-[#ddd8cc] dark:border-[#34453b] shadow-sm space-y-3">
              <h3 className="font-serif text-xl font-bold text-[#1f4d33] dark:text-[#8fd6a8] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#8b1a2b] dark:text-[#e8909e]" />
                <span>{t.visitUs}</span>
              </h3>
              <p className="text-base text-[#1d1d1b] dark:text-[#eee9de] leading-relaxed font-medium">
                {t.addressShort}
              </p>
              <p className="text-xs text-[#6b685f] dark:text-[#a9b4ac]">
                (Uttur, Tal. Ajra, Dist. Kolhapur, Maharashtra 416220)
              </p>
            </div>

            {/* Embedded Google Map */}
            <div className="rounded-2xl overflow-hidden border border-[#ddd8cc] dark:border-[#34453b] shadow-sm bg-[#faf8f3] dark:bg-[#1d2b23]">
              <div className="p-4 bg-white dark:bg-[#14201a] flex items-center justify-between border-b border-[#ddd8cc] dark:border-[#34453b]">
                <span className="font-serif text-base font-bold text-[#1f4d33] dark:text-[#8fd6a8]">
                  {t.locationHeading}
                </span>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Uttur+Ajra+Kolhapur"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#8b1a2b] dark:text-[#e8909e] hover:underline"
                >
                  <span>{t.openInMaps}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="relative w-full h-[220px]">
                <iframe
                  title="Chavan Traders Uttur Map"
                  src="https://maps.google.com/maps?q=Uttur,+Ajra,+Kolhapur,+Maharashtra&t=&z=14&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Working Enquiry Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-10 rounded-3xl bg-[#faf8f3] dark:bg-[#1d2b23] border border-[#ddd8cc] dark:border-[#34453b] shadow-lg">
              <div className="mb-6">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#8b1a2b] dark:text-[#e8909e]">
                  {t.enquiryTitle}
                </h3>
                <p className="text-sm text-[#6b685f] dark:text-[#a9b4ac] mt-1">
                  {t.enquirySub}
                </p>
              </div>

              {/* Status Alert */}
              {success && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">{t.enquirySuccess}</span>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot field (hidden from genuine users) */}
                <input
                  type="text"
                  name="website_fax_hp"
                  value={formData.honeypot}
                  onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                  style={{ display: "none" }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-[#1d1d1b] dark:text-[#eee9de] mb-1.5">
                    {t.nameLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t.namePlaceholder}
                    className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] dark:border-[#34453b] bg-white dark:bg-[#14201a] text-[#1d1d1b] dark:text-[#eee9de] focus:outline-none focus:ring-2 focus:ring-[#8b1a2b]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-[#1d1d1b] dark:text-[#eee9de]">
                      {t.phoneLabel} <span className="text-red-500">*</span>
                    </label>
                    {formData.phone && (
                      <span
                        className={`text-xs font-mono ${
                          formData.phone.length === 10
                            ? "text-green-600 font-bold"
                            : "text-amber-600"
                        }`}
                      >
                        {formData.phone.length}/10
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    placeholder={t.phonePlaceholder}
                    className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] dark:border-[#34453b] bg-white dark:bg-[#14201a] text-[#1d1d1b] dark:text-[#eee9de] focus:outline-none focus:ring-2 focus:ring-[#8b1a2b] font-mono"
                  />
                </div>

                {/* Product Select */}
                <div>
                  <label className="block text-sm font-bold text-[#1d1d1b] dark:text-[#eee9de] mb-1.5">
                    {t.productInterestLabel} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] dark:border-[#34453b] bg-white dark:bg-[#14201a] text-[#1d1d1b] dark:text-[#eee9de] focus:outline-none focus:ring-2 focus:ring-[#8b1a2b]"
                  >
                    <option value="">-- {t.selectProduct} --</option>
                    <option value="भात (Rice)">भात (Rice)</option>
                    <option value="सोयाबीन (Soybean)">सोयाबीन (Soybean)</option>
                    <option value="काजू बी (Cashew Nuts)">काजू बी (Cashew Nuts)</option>
                    <option value="शेंगा (Groundnut)">शेंगा (Groundnut)</option>
                    <option value="नाचणी (Nachani / Millet)">नाचणी (Nachani / Millet)</option>
                    <option value="इतर धान्ये (Other Commodities)">इतर धान्ये (Other Commodities)</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-bold text-[#1d1d1b] dark:text-[#eee9de] mb-1.5">
                    {t.messageLabel}
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.messagePlaceholder}
                    className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] dark:border-[#34453b] bg-white dark:bg-[#14201a] text-[#1d1d1b] dark:text-[#eee9de] focus:outline-none focus:ring-2 focus:ring-[#8b1a2b]"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#8b1a2b] hover:bg-[#701522] active:scale-[0.99] disabled:opacity-60 text-white font-bold text-lg shadow-md transition-all cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                  <span>{loading ? t.sendingBtn : t.submitBtn}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

