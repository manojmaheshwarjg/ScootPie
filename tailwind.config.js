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
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Playfair Display', 'serif'],
        mono: ['var(--font-space-mono)', 'Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
