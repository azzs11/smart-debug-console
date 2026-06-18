const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-500/20',    text: 'text-red-400',    border: 'border-red-500/50',    dot: 'bg-red-500',    pulse: true },
  error:    { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50', dot: 'bg-orange-500', pulse: false },
  warning:  { bg: 'bg-amber-500/20',  text: 'text-amber-400',  border: 'border-amber-500/50',  dot: 'bg-amber-500',  pulse: false },
  info:     { bg: 'bg-blue-500/20',   text: 'text-blue-400',   border: 'border-blue-500/50',   dot: 'bg-blue-500',   pulse: false },
  debug:    { bg: 'bg-gray-500/20',   text: 'text-gray-400',   border: 'border-gray-500/50',   dot: 'bg-gray-500',   pulse: false },
};

const SeverityBadge = ({ severity, size = 'sm' }) => {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.debug;
  const textSize = size === 'xs' ? 'text-xs' : 'text-xs';
  const px = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1.5 ${px} rounded font-mono font-semibold uppercase tracking-wider border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border} ${textSize}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {severity}
    </span>
  );
};

export default SeverityBadge;
export { SEVERITY_CONFIG };
