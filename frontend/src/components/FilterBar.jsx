import { Search, Filter, RotateCcw } from 'lucide-react';

const SEVERITIES = ['all', 'critical', 'error', 'warning', 'info', 'debug'];

const FilterBar = ({ searchTerm, setSearchTerm, selectedSeverity, setSelectedSeverity, onClearLogs }) => (
  <div className="card flex flex-wrap items-center gap-3 mb-4">
    {/* Search */}
    <div className="flex-1 min-w-48 relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="text"
        placeholder="Search logs..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full pl-8 pr-3 py-2 bg-bg-base border border-border-dim rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary font-mono transition-colors"
      />
    </div>

    {/* Severity pills */}
    <div className="flex items-center gap-1 flex-wrap">
      {SEVERITIES.map(sev => {
        const active = selectedSeverity === sev;
        const colorMap = {
          all: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
          critical: 'bg-red-500/20 text-red-400 border-red-500/40',
          error: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
          warning: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          info: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          debug: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
        };
        return (
          <button
            key={sev}
            onClick={() => setSelectedSeverity(sev)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold uppercase tracking-wide border transition-all duration-150 ${
              active ? colorMap[sev] : 'bg-transparent text-text-muted border-border-dim hover:border-text-muted'
            }`}
          >
            {sev}
          </button>
        );
      })}
    </div>

    {/* Clear */}
    <button
      onClick={onClearLogs}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
    >
      <RotateCcw size={12} />
      Clear
    </button>
  </div>
);

export default FilterBar;
