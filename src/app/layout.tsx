import type { Metadata } from "next";
import { Nunito, Open_Sans } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IRIS Siaga Air — Sistem Peringatan Dini Water Stress Sub-DAS",
  description:
    "Prototype sistem pendukung keputusan peringatan dini water stress sub-DAS (HUC12) untuk IFEST DAC 2026. Tim IRIS lagi BU.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${nunito.variable} ${openSans.variable}`}>
      <body className="min-h-screen bg-[#F4F6F9] text-[#1B2A41]">
        {children}
      </body>
    </html>
  );
}
