/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a',950:'#172554' },
        sidebar: { DEFAULT:'#0f1c2e', light:'#162337', hover:'#1e3050', active:'#253d5e' },
        dark: { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#e2e8f0', muted:'#94a3b8' },
      },
      fontFamily: {
        sans: ['Inter','system-ui','sans-serif'],
        display: ['"Plus Jakarta Sans"','Inter','sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn .3s ease-out',
        'slide-up': 'slideUp .3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%':{opacity:'0'},'100%':{opacity:'1'} },
        slideUp: { '0%':{transform:'translateY(10px)',opacity:'0'},'100%':{transform:'translateY(0)',opacity:'1'} },
      },
    },
  },
  plugins: [],
}
