/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:       "#070810",
        surface:  "#10111f",
        surface2: "#14152a",
        surface3: "#1a1b33",
        accent:   "#6366f1",
        cyan:     "#22d3ee",
        amber:    "#f59e0b",
        emerald:  "#10b981",
        rose:     "#f43f5e",
        text:     "#e2e4f0",
        "text-mid": "#9496b0",
        "text-dim": "#4a4c6a",
      },
      fontFamily: {
        mono:    ["'JetBrains Mono'", "monospace"],
        display: ["'Rajdhani'", "sans-serif"],
        body:    ["'Outfit'", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulseDot 2.5s ease-in-out infinite",
        "spin-slow":  "spinSlow 8s linear infinite",
        "fade-up":    "fadeUp 0.4s ease forwards",
      },
    },
  },
  plugins: [],
};
