import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff0f0",
          100: "#ffe0e0",
          200: "#ffc0c0",
          300: "#ff8080",
          400: "#ff4444",
          500: "#e31e24",
          600: "#c41920",
          700: "#a0141a",
          800: "#7a1013",
          900: "#5a0c0e",
        },
        sand: "#f6f3ec",
        panel: {
          950: "#0a0a0a",
          900: "#111111",
          800: "#1a1a1a",
          700: "#222222",
          600: "#2a2a2a",
          500: "#333333",
          400: "#444444",
        },
      },
      fontFamily: {
        sans:    ["system-ui", "-apple-system", "sans-serif"],
        display: ["system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
