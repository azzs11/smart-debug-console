import { useEffect, useRef } from 'react';

const COLOR_MAP = {
  blue:   { border: 'border-accent-primary/30',  text: 'text-accent-primary',   glow: '',         grad: 'rgba(13,61,46,0.06)'    },
  red:    { border: 'border-red-600/30',          text: 'text-red-700',          glow: 'glow-red', grad: 'rgba(185,28,28,0.07)'   },
  orange: { border: 'border-orange-600/30',       text: 'text-orange-700',       glow: '',         grad: 'rgba(194,65,12,0.07)'   },
  yellow: { border: 'border-amber-600/30',        text: 'text-amber-700',        glow: '',         grad: 'rgba(146,64,14,0.07)'   },
  green:  { border: 'border-accent-primary/30',   text: 'text-accent-primary',   glow: 'glow-green', grad: 'rgba(13,61,46,0.06)' },
  purple: { border: 'border-accent-secondary/30', text: 'text-accent-secondary', glow: '',         grad: 'rgba(109,40,217,0.06)'  },
  gray:   { border: 'border-gray-400/30',         text: 'text-gray-500',         glow: '',         grad: 'rgba(107,114,128,0.05)' },
};

const StatsCard = ({ title, value, icon, color = 'blue', subtitle, glow = false }) => {
  const prevRef = useRef(value);
  const spanRef = useRef(null);
  const cfg     = COLOR_MAP[color] || COLOR_MAP.blue;

  useEffect(() => {
    if (prevRef.current !== value && spanRef.current) {
      spanRef.current.classList.remove('count-update');
      void spanRef.current.offsetWidth;
      spanRef.current.classList.add('count-update');
    }
    prevRef.current = value;
  }, [value]);

  return (
    <div
      className={`card border-l-4 ${cfg.border} ${glow ? cfg.glow : ''} flex items-start justify-between gap-3 transition-all duration-300`}
      style={{
        background: `linear-gradient(135deg, ${cfg.grad} 0%, transparent 65%), var(--bg-surface)`,
      }}
    >
      <div className="min-w-0">
        <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-1">{title}</p>
        <p ref={spanRef} className={`text-3xl font-bold ${cfg.text} tabular-nums`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className={`${cfg.text} opacity-50 shrink-0 mt-0.5`}>{icon}</div>
    </div>
  );
};

export default StatsCard;
