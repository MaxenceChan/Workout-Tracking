/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // ✅ active le mode sombre via la classe "dark"
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🎨 Palette personnalisée douce et cohérente pour ton app
        background: {
          light: "#f9fafb",
          dark: "#0d0d0d",
        },
        card: {
          light: "#ffffff",
          dark: "#1c1c1c",
        },
        input: {
          dark: "#2a2a2a",
        },
      },
    },
  },
  plugins: [],
};
