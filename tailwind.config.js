/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Fraunces", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        brand: {
          50:  "#fdf2ec",
          100: "#fae0d0",
          200: "#f4b99a",
          300: "#e98e64",
          400: "#d97040",
          500: "#C8643A",
          600: "#a84e2a",
          700: "#8a3d20",
          800: "#6d2e18",
          900: "#3d180a",
        },
        accent: {
          400: "#7dd3fc",
          500: "#38bdf8",
          600: "#0ea5e9",
        },
        background: {
          light: "#f9fafb",
          dark: "#0b0c0d",
        },
        card: {
          light: "#ffffff",
          dark: "#141516",
        },
        input: {
          dark: "#1f2023",
        },
      },
      boxShadow: {
        xs:    "0 1px 2px rgba(15, 23, 42, 0.04)",
        soft:  "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        card:  "0 6px 18px -8px rgba(15, 23, 42, 0.18), 0 2px 6px -2px rgba(15, 23, 42, 0.06)",
        lift:  "0 20px 40px -16px rgba(15, 23, 42, 0.22), 0 4px 12px -4px rgba(15, 23, 42, 0.08)",
        xl2:   "0 32px 64px -24px rgba(15, 23, 42, 0.28), 0 8px 20px -6px rgba(15, 23, 42, 0.10)",
        glow:  "0 10px 40px -10px rgba(200, 100, 58, 0.40)",
        glowx: "0 18px 60px -10px rgba(200, 100, 58, 0.55)",
      },
      borderRadius: {
        xl:  "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scale-pop": {
          "0%":   { opacity: "0", transform: "scale(0.85)" },
          "70%":  { opacity: "1", transform: "scale(1.04)" },
          "100%": { transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "slide-up-fade": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up":  "fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "scale-pop":"scale-pop 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "float":    "float 3s ease-in-out infinite",
        "shimmer":  "shimmer 1.6s infinite linear",
        "slide-up": "slide-up-fade 380ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        snappy: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
