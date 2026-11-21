/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uos: {
          navy: '#0b1d3a',
          blue: '#1a365d',
          gold: '#c59b27',
          emerald: '#059669',
          crimson: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
