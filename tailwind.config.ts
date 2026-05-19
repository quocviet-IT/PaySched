import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // Hung Phat brand tokens
        "hp-foundation": "var(--bg-foundation)",
        "hp-card": "var(--surface-card)",
        "hp-inset": "var(--surface-inset)",
        "hp-ink": "var(--ink-primary)",
        "hp-body": "var(--ink-body)",
        "hp-muted": "var(--ink-muted)",
        "hp-rule": "var(--rule)",
        "hp-pink": "var(--accent)",
        "hp-platinum": "var(--platinum)",
        // shadcn-compatible aliases (kept so any future shadcn primitives work)
        background: "var(--bg-foundation)",
        foreground: "var(--ink-primary)",
        border: "var(--rule)",
        input: "var(--rule)",
        ring: "var(--accent)",
        card: "var(--surface-card)",
        muted: "var(--surface-inset)",
        destructive: "var(--accent)",
        primary: "var(--ink-primary)",
      },
      fontFamily: {
        title: ["var(--font-title)", "Cormorant Garamond", "Georgia", "serif"],
        body: ["var(--font-body)", "Cardo", "Georgia", "serif"],
      },
      letterSpacing: {
        eyebrow: "0.14em",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
