
const StatsCard = ({ title, value, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    gray: 'from-gray-500 to-gray-600'
  };

  return (
    <div className={`stats-card bg-gradient-to-br ${colorClasses[color]} text-white rounded-lg p-6 shadow-lg transform transition-all duration-300 hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-4xl opacity-80">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;