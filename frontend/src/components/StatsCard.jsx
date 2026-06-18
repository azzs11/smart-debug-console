import { useEffect, useRef } from 'react';

const COLOR_MAP = {
  blue:     { border: 'border-blue-500/40',   text: 'text-blue-400',   glow: '' },
  red:      { border: 'border-red-500/40',    text: 'text-red-400',    glow: 'glow-red' },
  orange:   { border: 'border-orange-500/40', text: 'text-orange-400', glow: '' },
  yellow:   { border: 'border-amber-500/40',  text: 'text-amber-400',  glow: '' },
  green:    { border: 'border-green-500/40',  text: 'text-green-400',  glow: '' },
  purple:   { border: 'border-purple-500/40', text: 'text-purple-400', glow: '' },
  gray:     { border: 'border-gray-500/40',   text: 'text-gray-400',   glow: '' },
};

const StatsCard = ({ title, value, icon, color = 'blue', subtitle, glow = false }) => {
  const prevRef  = useRef(value);
  const spanRef  = useRef(null);
  const cfg = COLOR_MAP[color] || COLOR_MAP.blue;

  useEffect(() => {
    if (prevRef.current !== value && spanRef.current) {
      spanRef.current.classList.remove('count-update');
      void spanRef.current.offsetWidth; // reflow
      spanRef.current.classList.add('count-update');
    }
    prevRef.current = value;
  }, [value]);

  return (
    <div className={`card border-l-4 ${cfg.border} ${glow ? cfg.glow : ''} flex items-start justify-between gap-3 transition-all duration-300`}>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-1">{title}</p>
        <p ref={spanRef} className={`text-3xl font-bold ${cfg.text} tabular-nums`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className={`${cfg.text} opacity-60 shrink-0 mt-0.5`}>{icon}</div>
    </div>
  );
};

export default StatsCard;
