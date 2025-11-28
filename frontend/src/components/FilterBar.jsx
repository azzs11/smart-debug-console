import { Filter, RotateCcw, Search } from 'lucide-react';

const FilterBar = ({ 
  searchTerm, 
  setSearchTerm, 
  selectedSeverity, 
  setSelectedSeverity,
  onClearLogs 
}) => {
  const severities = ['all', 'critical', 'error', 'warning', 'info', 'debug'];

  const getSeverityColor = (severity) => {
    const colors = {
      all: 'bg-gray-500',
      critical: 'bg-red-600',
      error: 'bg-orange-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500',
      debug: 'bg-gray-400'
    };
    return colors[severity] || 'bg-gray-500';
  };

  return (
    <div className="filter-bar bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search Input */}
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-600" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {severities.map(severity => (
              <option key={severity} value={severity}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Button */}
        <button
          onClick={onClearLogs}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
        >
          <RotateCcw size={18} />
          Clear Logs
        </button>
      </div>

      {/* Active Filters Display */}
      {(searchTerm || selectedSeverity !== 'all') && (
        <div className="mt-3 flex flex-wrap gap-2">
          {searchTerm && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              Search: "{searchTerm}"
            </span>
          )}
          {selectedSeverity !== 'all' && (
            <span className={`px-3 py-1 ${getSeverityColor(selectedSeverity)} text-white rounded-full text-sm`}>
              Filter: {selectedSeverity}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;