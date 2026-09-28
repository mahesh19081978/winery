import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { BookingProvider } from "@/context/BookingContext";
import { GuestProvider } from "@/context/GuestContext";
import { ConciergeProvider } from "@/context/ConciergeContext";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap"
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap"
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VINORA | Winery & Wine Experience Platform",
    template: "%s | VINORA",
  },
  description: "Discover handcrafted biodynamic wines, cellar tastings, vineyard picnics, and sunset dining at VINORA.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo-mark.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo-mark.png' },
    ],
  },
  openGraph: {
    title: "VINORA | Winery & Wine Experience Platform",
    description: "Discover handcrafted biodynamic wines, cellar tastings, vineyard picnics, and sunset dining at VINORA.",
    siteName: "VINORA",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'VINORA — Winery & Wine Experience Platform',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VINORA | Winery & Wine Experience Platform",
    description: "Discover handcrafted biodynamic wines, cellar tastings, vineyard picnics, and sunset dining at VINORA.",
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#faf8f5] text-[#191c1f]">
        <BookingProvider>
          <GuestProvider>
            <ConciergeProvider>
              {children}
            </ConciergeProvider>
          </GuestProvider>
        </BookingProvider>
      </body>
    </html>
  );
}

