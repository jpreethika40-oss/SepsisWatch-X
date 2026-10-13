/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ember: {
          bg: '#0C0B0A',
          surface: '#151311',
          surfaceHover: '#1E1B18',
          elevated: '#1E1B18',
          card: 'rgba(21, 19, 17, 0.85)',
          border: '#332E29',
          borderHover: 'rgba(251, 191, 36, 0.4)',
          primary: '#F97316',
          gold: '#FBBF24',
          accent: '#10B981',
          stable: '#22C55E',
          watch: '#FACC15',
          critical: '#EF4444',
          uncertain: '#B8B0A4',
          text: '#F3EEE8',
          muted: '#A09689'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-ember': '0 0 25px rgba(249, 115, 22, 0.45)',
        'glow-gold': '0 0 25px rgba(251, 191, 36, 0.45)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.35)',
        'glow-critical': '0 0 30px rgba(239, 68, 68, 0.55)',
        'glow-watch': '0 0 20px rgba(250, 204, 21, 0.40)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'alert-pulse': 'alertPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        alertPulse: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.7, transform: 'scale(1.02)' },
        }
      }
    },
  },
  plugins: [],
}
