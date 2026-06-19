/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':     '#f7f0e6',
        'bg-surface':  '#fdf8f2',
        'bg-elevated': '#ede4d8',
        'accent-primary':   '#0d3d2e',
        'accent-secondary': '#6d28d9',
        'accent-success':   '#065f46',
        'accent-warning':   '#92400e',
        'accent-danger':    '#991b1b',
        'accent-critical':  '#7f1d1d',
        'text-primary':   '#0f1a14',
        'text-secondary': '#4b5563',
        'text-muted':     '#9ca3af',
        'border-dim':     '#d4c9ba',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Menlo', 'monospace'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glow-teal':  '0 4px 16px rgba(13,61,46,0.15)',
        'glow-red':   '0 4px 16px rgba(185,28,28,0.18)',
        'glow-green': '0 4px 16px rgba(13,61,46,0.15)',
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
          '50%':     { background: 'rgba(185,28,28,0.06)' },
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
