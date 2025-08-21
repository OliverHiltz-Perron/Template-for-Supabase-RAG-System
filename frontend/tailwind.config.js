/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#10b981',
        'primary-dark': '#059669',
        'secondary': '#3b82f6',
        'dark': '#1f2937',
        'light': '#f3f4f6'
      }
    },
  },
  plugins: [],
}