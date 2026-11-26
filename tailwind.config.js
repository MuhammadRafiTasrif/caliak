/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Biru tua khas aplikasi pemerintahan.
        primer: {
          50: '#eef3fb',
          100: '#d5e1f4',
          200: '#aac3e9',
          500: '#2f5ea8',
          600: '#234c8f',
          700: '#1b3c73',
          800: '#152f5a',
          900: '#0f2242',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
