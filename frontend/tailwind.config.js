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
        clinical: {
          bg: '#070b14',
          surface: '#0d1527',
          surfaceHover: '#131e36',
          card: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(56, 189, 248, 0.15)',
          borderHover: 'rgba(56, 189, 248, 0.35)',
          cyan: '#06b6d4',
          cyanGlow: '#22d3ee',
          emerald: '#10b981',
          amber: '#f59e0b',
          crimson: '#ef4444',
          purple: '#a855f7',
          muted: '#64748b',
          text: '#f8fafc',
          subtext: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.35)',
        'glow-crimson': '0 0 25px -3px rgba(239, 68, 68, 0.45)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
        'glow-amber': '0 0 20px -3px rgba(245, 158, 11, 0.35)',
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
