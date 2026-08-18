/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#0d9488', // teal-600
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
        }
      }
    },
  },
  plugins: [],
}
