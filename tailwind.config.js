/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'alphanom-bg': '#F6F6FB',
        'alphanom-navy': '#0B1F3A',
        'alphanom-teal': '#00B4A6',
      },
      fontFamily: {
        'jakarta': ['Plus Jakarta Sans', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
};
