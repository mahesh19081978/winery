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

export const metadata: Metadata = {
  title: "VINORA | Winery & Wine Experience Platform",
  description: "Discover handcrafted biodynamic wines, cellar tastings, vineyard picnics, and sunset dining at VINORA.",
  openGraph: {
    title: "VINORA | Winery & Wine Experience Platform",
    description: "Discover handcrafted biodynamic wines, cellar tastings, vineyard picnics, and sunset dining at VINORA.",
    siteName: "VINORA",
    locale: "en_US",
    type: "website"
  }
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

