import { useState } from 'react';
import { Terminal, GitBranch, Zap, Settings } from 'lucide-react';

const STEPS = [
  {
    icon: <span className="text-5xl select-none">◈</span>,
    title: 'Meet ChronoLog',
    body: 'Most monitoring tools tell you what broke. ChronoLog tells you why — by automatically tracing causal chains between log events in real time.',
    hint: null,
  },
  {
    icon: <Terminal size={44} strokeWidth={1.5} className="text-accent-primary" />,
    title: 'Live log intelligence',
    body: 'Every incoming log is classified by an ML model, scored for anomalies, and linked to its root cause — all within 500ms of arrival.',
    hint: 'Look for the colour-coded severity badges and confidence scores in the log stream.',
  },
  {
    icon: <GitBranch size={44} strokeWidth={1.5} className="text-accent-secondary" />,
    title: 'Root cause, not symptoms',
    body: 'When a database goes down, ChronoLog maps the full downstream cascade — so you fix the one root node instead of chasing five error messages.',
    hint: 'Open the Causal Graph from the left sidebar to see relationships as a live D3 graph.',
  },
  {
    icon: <Zap size={44} strokeWidth={1.5} className="text-accent-warning" />,
    title: "Ready? Start your first stream",
    body: 'Open Settings (gear icon, top right), enter your API key, and hit Start Generator. Logs will appear within seconds.',
    hint: 'Default key in development: dev-admin-key-change-in-production',
  },
];

const Onboarding = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <div
      className="onboarding-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,13,11,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="onboarding-modal relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0f1a14 0%, #111f18 100%)',
          border: '1px solid #1a3528',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,211,165,0.06)',
        }}
      >
        {/* Top accent line */}
        <div
          className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, #22d3a5 40%, #c4b5fd 70%, transparent)' }}
        />

        <div className="px-8 pt-8 pb-6">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width:  i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? '#22d3a5' : '#1a3528',
                }}
              />
            ))}
            <span className="ml-auto text-xs font-mono text-text-muted">
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="flex items-center justify-center w-20 h-20 rounded-2xl"
              style={{ background: 'rgba(34,211,165,0.06)', border: '1px solid rgba(34,211,165,0.12)' }}
            >
              {current.icon}
            </div>
          </div>

          {/* Text */}
          <h2
            className="font-display text-2xl font-semibold text-center mb-3"
            style={{ color: '#f0faf5', lineHeight: 1.25 }}
          >
            {current.title}
          </h2>
          <p className="text-sm text-center leading-relaxed" style={{ color: '#86a898' }}>
            {current.body}
          </p>

          {/* Hint */}
          {current.hint && (
            <div
              className="mt-4 rounded-lg px-4 py-3 text-xs font-mono leading-relaxed text-center"
              style={{ background: 'rgba(196,181,253,0.07)', border: '1px solid rgba(196,181,253,0.12)', color: '#c4b5fd' }}
            >
              {current.hint}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: '#172b1e', border: '1px solid #1a3528', color: '#86a898' }}
              >
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: '#172b1e', border: '1px solid #1a3528', color: '#3d5a4a' }}
              >
                Skip
              </button>
            )}

            <button
              onClick={isLast ? onClose : () => setStep(s => s + 1)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, #22d3a5 0%, #1ab88e 100%)',
                color: '#080d0b',
                boxShadow: '0 4px 16px rgba(34,211,165,0.25)',
              }}
            >
              {isLast ? "Let's go →" : 'Next'}
            </button>
          </div>
        </div>

        {/* Settings hint on last step */}
        {isLast && (
          <div
            className="flex items-center gap-2 px-8 py-4 text-xs"
            style={{ borderTop: '1px solid #1a3528', color: '#3d5a4a' }}
          >
            <Settings size={12} />
            <span>Gear icon is in the top-right corner of the app bar</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
