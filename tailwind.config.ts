import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        toc: {
          optimal: "#10b981",    // emerald
          watch: "#f59e0b",      // amber
          reorder: "#6366f1",    // indigo
          critical: "#ef4444",   // rose
          excess: "#ec4899",     // pink
          incoming: "#06b6d4",   // cyan
        }
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        glow: {
          "from": { boxShadow: "0 0 10px rgba(99, 102, 241, 0.3)" },
          "to": { boxShadow: "0 0 25px rgba(99, 102, 241, 0.7)" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
