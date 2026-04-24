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
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#e8faf3",
          100: "#c5f2dd",
          200: "#8ee5c0",
          300: "#52d29d",
          400: "#1fba7a",
          500: "#0aa165",
          600: "#007b5e",
          700: "#00634a",
          800: "#004a37",
          900: "#032a20",
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
        xs:   "0 1px 2px rgba(15, 23, 42, 0.04)",
        soft: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        card: "0 6px 18px -8px rgba(15, 23, 42, 0.18), 0 2px 6px -2px rgba(15, 23, 42, 0.06)",
        lift: "0 20px 40px -16px rgba(15, 23, 42, 0.22), 0 4px 12px -4px rgba(15, 23, 42, 0.08)",
        glow: "0 10px 40px -10px rgba(0, 123, 94, 0.35)",
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
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "float": "float 3s ease-in-out infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
