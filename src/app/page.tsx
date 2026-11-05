"use client";

import React from "react";
import { Header } from "@/components/public/Header";
import { Hero } from "@/components/public/Hero";
import { TrustStrip } from "@/components/public/TrustStrip";
import { ProductsSection } from "@/components/public/ProductsSection";
import { AboutSection } from "@/components/public/AboutSection";
import { ContactSection } from "@/components/public/ContactSection";
import { FloatingWhatsApp } from "@/components/public/FloatingWhatsApp";
import { Footer } from "@/components/public/Footer";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <ProductsSection />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
