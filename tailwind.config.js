/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")], // <--- ДОДАЛИ ЦЕЙ РЯДОК
  theme: {
    extend: {},
  },
  plugins: [],
}