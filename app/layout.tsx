import type { Metadata } from "next";
import { Cormorant_Garamond, Cardo } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const titleFont = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-title",
  display: "swap",
});

const bodyFont = Cardo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PaySchedManager — Hung Phat",
  description: "Recurring vendor payment scheduling and history",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titleFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-hp-foundation text-hp-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
