/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':     '#0a0e1a',
        'bg-surface':  '#111827',
        'bg-elevated': '#1f2937',
        'accent-primary':   '#6366f1',
        'accent-secondary': '#8b5cf6',
        'accent-success':   '#10b981',
        'accent-warning':   '#f59e0b',
        'accent-danger':    '#ef4444',
        'accent-critical':  '#dc2626',
        'text-primary':   '#f9fafb',
        'text-secondary': '#9ca3af',
        'text-muted':     '#4b5563',
        'border-dim':     '#1f2937',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-indigo': '0 0 20px rgba(99,102,241,0.3)',
        'glow-red':    '0 0 20px rgba(239,68,68,0.4)',
        'glow-green':  '0 0 20px rgba(16,185,129,0.3)',
      },
      animation: {
        'log-slide': 'logSlide 0.2s ease-out',
        'critical-flash': 'criticalFlash 0.6s ease-out',
        'pulse-dot': 'pulseDot 2s cubic-bezier(0.4,0,0.6,1) infinite',
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
