// Tailwind v3 preset: in tailwind.config: `presets: [require("./tailwind.brand.cjs")]`.
// Gives classes like bg-kv-surface, text-kv-muted, border-kv-attack, font-display, rounded-kv.
module.exports = {
  theme: {
    extend: {
      colors: {
        kv: {
          bg: "#0a0a16",
          surface: "#12121f",
          "surface-2": "#1a1a2b",
          border: "#26263a",
          "border-strong": "#3a3a55",
          text: "#f5f5fa",
          muted: "#a1a1b5",
          faint: "#6b6b80",
          attack: "#ff4d6d",
          "attack-soft": "rgb(255 77 109 / 0.14)",
          defend: "#22d3ee",
          "defend-soft": "rgb(34 211 238 / 0.12)",
          secure: "#34d399",
          "secure-soft": "rgb(52 211 153 / 0.12)",
          verdict: "#ffb020",
          "verdict-soft": "rgb(255 176 32 / 0.12)",
          brand: "#7c5cff",
          "brand-hover": "#9a82ff",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        display: ['"Inter Display"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: { kv: "14px" },
    },
  },
};
