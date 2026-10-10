/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-navy': '#142B4A',
        'secondary-navy': '#203B5D',
        'app-bg': '#F5F7FA',
        'card-bg': '#FFFFFF',
        'text-primary': '#1E293B',
        'text-secondary': '#64748B',
        'app-border': '#E2E8F0',
        'teal-accent': '#0D9488',
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#142B4A',
        }
      }
    },
  },
  plugins: [],
}
