/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          darkRed: '#8B1E2D',
          red: '#E63946',
          yellow: '#F4D35E',
          blue: '#457B9D',
          veryLightGreen: '#E8F5E9',
          lightGreen: '#A5D6A7',
          green: '#66BB6A',
          darkGreen: '#1B5E20',
        },
        dark: {
          bg: '#3B7597',
          card: '#151D2A',
          border: '#232E42',
          hover: '#1E2A3E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
