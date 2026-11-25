/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Be Vietnam Pro"', 'sans-serif'] },
      colors: {
        bgsoft: '#F6F7F5',
        mint: '#EFF6F1',
        forest: { dark: '#183D2B', DEFAULT: '#2E7D32', bright: '#38A169' },
        sale: { DEFAULT: '#E03E3E', hover: '#C53030' },
        sunny: '#F59E0B',
        harvest: { light: '#FEF3C7', DEFAULT: '#B45309', dark: '#78350F' },
      },
      borderRadius: { card: '16px', panel: '20px' },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(24, 61, 43, 0.08)',
        hover: '0 12px 28px -8px rgba(24, 61, 43, 0.14)',
        float: '0 10px 25px -5px rgba(46, 125, 50, 0.4)',
      },
    },
  },
  plugins: [],
};

