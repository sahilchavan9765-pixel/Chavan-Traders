import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google";
import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TopProgressBar } from "@/components/ui/TopProgressBar";
import { Suspense } from "react";
import "./globals.css";

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-devanagari",
  display: "swap",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["600", "700", "800"],
  variable: "--font-serif-devanagari",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8b1a2b" },
    { media: "(prefers-color-scheme: dark)", color: "#121915" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chavantraders.store";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "चव्हाण ट्रेडर्स | Chavan Traders — Grain Trading, Uttur",
    template: "%s | Chavan Traders",
  },
  description:
    "चव्हाण ट्रेडर्स (उत्तूर, ता. आजरा, जि. कोल्हापूर) - भात, सोयाबीन, काजू बी, शेंगा, नाचणी आणि इतर सर्व प्रकारच्या धान्यांची खरेदी विक्री.",
  keywords: [
    "Chavan Traders",
    "चव्हाण ट्रेडर्स",
    "Uttur grain trading",
    "Ajra Kolhapur grains",
    "Paddy rice purchase",
    "Soybean wholesale Kolhapur",
    "Raw cashew nut trading",
    "Groundnut shenga Uttur",
    "Nachani ragi trader",
    "Maharashtra agri business",
  ],
  authors: [{ name: "Chavan Traders", url: siteUrl }],
  creator: "Chavan Traders",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "mr_IN",
    alternateLocale: "en_IN",
    url: siteUrl,
    title: "चव्हाण ट्रेडर्स | Chavan Traders (उत्तूर, आजरा, कोल्हापूर)",
    description:
      "आमच्याकडे भात, सोयाबीन, काजू बी, शेंगा, नाचणी आणि इतर सर्व प्रकारच्या धान्यांची खरेदी विक्री केली जाईल. फोन: 9765941078, व्हॉट्सॲप: 9850815527.",
    siteName: "Chavan Traders",
    images: [
      {
        url: "/images/hero-grains.webp",
        width: 1200,
        height: 630,
        alt: "Chavan Traders Grains",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "चव्हाण ट्रेडर्स | Chavan Traders",
    description:
      "Grain trading in Uttur, Ajra, Kolhapur. Rice, Soybean, Cashew, Groundnut, Nachani.",
    images: ["/images/hero-grains.webp"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "चव्हाण ट्रेडर्स (Chavan Traders)",
  "image": `${siteUrl}/images/hero-grains.webp`,
  "telephone": "+919765941078",
  "url": siteUrl,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Talegalli",
    "addressLocality": "Uttur, Taluka Ajra",
    "addressRegion": "Maharashtra",
    "postalCode": "416220",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "16.1424",
    "longitude": "74.2046"
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ],
    "opens": "08:00",
    "closes": "20:00"
  },
  "sameAs": [
    "https://wa.me/919850815527"
  ]
};

const themeInitScript = `(function(){
  try {
    var t = localStorage.getItem('ct_theme') || 'system';
    var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="mr"
      className={`${notoSansDevanagari.variable} ${notoSerifDevanagari.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col transition-colors">
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <Suspense fallback={null}>
                <TopProgressBar />
              </Suspense>
              {children}
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
