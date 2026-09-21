import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { BookingProvider } from "@/context/BookingContext";
import { GuestProvider } from "@/context/GuestContext";
import { ConciergeProvider } from "@/context/ConciergeContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WineConcierge from "@/components/concierge/WineConcierge";

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
  title: "Domaine Élysée | Val de Rêve Estate Winery & Vineyard Experiences",
  description: "Discover handcrafted biodynamic wines, cellar tastings, vineyard picnics, and sunset dining at Domaine Élysée Val de Rêve Estate.",
  openGraph: {
    title: "Domaine Élysée | Val de Rêve Estate",
    description: "Discover handcrafted biodynamic wines, cellar tastings, vineyard picnics, and sunset dining at Domaine Élysée Val de Rêve Estate.",
    url: "https://domaine-elysee.com",
    siteName: "Domaine Élysée",
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
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <WineConcierge />
            </ConciergeProvider>
          </GuestProvider>
        </BookingProvider>
      </body>
    </html>
  );
}

