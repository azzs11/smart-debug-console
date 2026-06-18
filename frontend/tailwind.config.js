/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':     '#080d0b',
        'bg-surface':  '#0f1a14',
        'bg-elevated': '#172b1e',
        'accent-primary':   '#22d3a5',
        'accent-secondary': '#c4b5fd',
        'accent-success':   '#22d3a5',
        'accent-warning':   '#fbbf24',
        'accent-danger':    '#f87171',
        'accent-critical':  '#ef4444',
        'text-primary':   '#f0faf5',
        'text-secondary': '#86a898',
        'text-muted':     '#3d5a4a',
        'border-dim':     '#1a3528',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Menlo', 'monospace'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glow-teal':  '0 0 24px rgba(34,211,165,0.25)',
        'glow-red':   '0 0 20px rgba(239,68,68,0.4)',
        'glow-green': '0 0 20px rgba(34,211,165,0.3)',
      },
      animation: {
        'log-slide':      'logSlide 0.2s ease-out',
        'critical-flash': 'criticalFlash 0.6s ease-out',
        'pulse-dot':      'pulseDot 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        logSlide: {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        criticalFlash: {
          '0%,100%': { background: 'transparent' },
          '50%':     { background: 'rgba(239,68,68,0.08)' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%':     { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
    },
  },
  plugins: [],
};
