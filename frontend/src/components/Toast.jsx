import { useEffect, useState } from 'react';
import { X, GitCommit, AlertTriangle, Zap } from 'lucide-react';

const TOAST_ICONS = {
  'causal-chain-detected': <GitCommit size={16} className="text-indigo-400" />,
  'anomaly':               <Zap size={16} className="text-amber-400" />,
  'warning':               <AlertTriangle size={16} className="text-amber-400" />,
};

const ToastItem = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 280);
  };

  useEffect(() => {
    const t = setTimeout(dismiss, toast.duration || 6000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  return (
    <div className={`${exiting ? 'toast-exit' : 'toast-enter'} flex items-start gap-3 bg-bg-elevated border border-border-dim rounded-lg px-4 py-3 shadow-xl max-w-xs w-full pointer-events-auto`}>
      <div className="shrink-0 mt-0.5">{TOAST_ICONS[toast.type] || <Zap size={16} className="text-indigo-400" />}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary leading-snug">{toast.title}</p>
        {toast.body && <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{toast.body}</p>}
      </div>
      <button onClick={dismiss} className="shrink-0 text-text-muted hover:text-text-secondary transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
  </div>
);

export default ToastContainer;
