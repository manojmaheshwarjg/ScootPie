/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./App.tsx",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#f97316",
      },
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
