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

// Runs before React hydrates so the dark class is set during the very first
// paint — avoids a flash from light → dark when the user has dark mode saved.
const themeBootScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titleFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen bg-hp-foundation text-hp-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
