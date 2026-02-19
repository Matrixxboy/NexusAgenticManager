/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F8F5FA",
        surface: "#FFFFFF",
        surface2: "#F3EEF6",
        surface3: "#DCD0E6",
        accent: "#6D5A7D",
        cyan: "#8E8098",
        amber: "#B8A3C9",
        emerald: "#869D92",
        rose: "#BC7C84",
        text: "#2E2532",
        "text-mid": "#655C6B",
        "text-dim": "#9C94A3",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Rajdhani'", "sans-serif"],
        body: ["'Outfit'", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulseDot 2.5s ease-in-out infinite",
        "spin-slow": "spinSlow 8s linear infinite",
        "fade-up": "fadeUp 0.4s ease forwards",
      },
    },
  },
  plugins: [],
}

