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
        'alphanom-navy-soft': '#1B3557',
        'alphanom-teal-soft': '#E6F7F5',
        'alphanom-line': '#E7E7F0',
        'alphanom-muted': '#6B7392',
      },
      fontFamily: {
        'jakarta': ['Plus Jakarta Sans', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'pill': '999px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(11,31,58,0.04), 0 8px 24px -12px rgba(11,31,58,0.12)',
        'lift': '0 2px 4px rgba(11,31,58,0.06), 0 16px 40px -16px rgba(11,31,58,0.22)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0B1F3A 0%, #1B3557 55%, #00B4A6 160%)',
      },
    },
  },
  plugins: [],
};
