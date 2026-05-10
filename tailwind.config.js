/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // ─── Colors ─────────────────────────────────────────────────────────
      colors: {
        // Brand — calm indigo with electric edge (default; overridden at runtime
        // via CSS variables when user picks an accent).
        brand: {
          50:  "rgb(var(--brand-50)  / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
          800: "rgb(var(--brand-800) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
        },
        success: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        flame: {
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
        violet: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        rose: {
          400: "#fb7185",
          500: "#f43f5e",
        },
        // Surfaces driven by CSS variables so light/dark + focus-mode all share tokens
        surface: {
          DEFAULT: "rgb(var(--surface)      / <alpha-value>)",
          soft:    "rgb(var(--surface-soft) / <alpha-value>)",
          muted:   "rgb(var(--surface-muted)/ <alpha-value>)",
          border:  "rgb(var(--border)       / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink)       / <alpha-value>)",
          soft:    "rgb(var(--ink-soft)  / <alpha-value>)",
          muted:   "rgb(var(--ink-muted) / <alpha-value>)",
        },
      },
      // ─── Type ──────────────────────────────────────────────────────────
      fontFamily: {
        sans: [
          "Inter",
          "Manrope",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Manrope",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      letterSpacing: {
        tightish: "-0.01em",
        tighter2: "-0.02em",
      },
      // ─── Radius / shadow ──────────────────────────────────────────────
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft:   "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px -4px rgba(15,23,42,0.06)",
        lift:   "0 2px 6px rgba(15,23,42,0.06), 0 18px 40px -12px rgba(15,23,42,0.18)",
        glow:   "0 0 0 1px rgb(var(--brand-500) / 0.18), 0 12px 40px -8px rgb(var(--brand-500) / 0.40)",
        ring:   "inset 0 0 0 1px rgb(var(--border) / 1)",
        glass:  "0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 30px -10px rgba(2,6,23,0.40)",
      },
      // ─── Animations ───────────────────────────────────────────────────
      keyframes: {
        "fade-in":   { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up":  {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%":   { transform: "scale(0.92)", opacity: "0" },
          "60%":  { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-in":    "fade-in 250ms ease-out both",
        "slide-up":   "slide-up 350ms cubic-bezier(0.22, 1, 0.36, 1) both",
        pop:          "pop 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        shimmer:      "shimmer 1.6s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "spin-slow":  "spin-slow 12s linear infinite",
        float:        "float 6s ease-in-out infinite",
        "gradient-pan": "gradient-pan 12s ease-in-out infinite",
      },
      // ─── Misc ─────────────────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
