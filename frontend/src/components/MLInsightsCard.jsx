// frontend/src/components/MLInsightsCard.jsx
import { Brain, Target, TrendingUp, Zap } from 'lucide-react';

const MLInsightsCard = ({ mlStats, isMLEnabled }) => {
  if (!isMLEnabled) {
    return (
      <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain size={28} className="text-gray-400" />
          <h2 className="text-xl font-bold">AI Classification</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">🤖 ML Service Offline</p>
          <p className="text-sm text-gray-500">Start ML service to enable AI-powered classification</p>
        </div>
      </div>
    );
  }

  if (!mlStats) {
    return (
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain size={28} />
          <h2 className="text-xl font-bold">AI Classification</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-white mb-2">⏳ Waiting for logs...</p>
          <p className="text-sm text-purple-200">ML predictions will appear here</p>
        </div>
      </div>
    );
  }

  const accuracyPercent = parseFloat(mlStats.accuracy || 0);
  const confidencePercent = parseFloat(mlStats.avg_confidence || 0);

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 85) return 'text-green-400';
    if (accuracy >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain size={28} />
          <h2 className="text-xl font-bold">🤖 AI Classification</h2>
        </div>
        <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
          <span className="text-xs font-semibold">ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Accuracy */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Target size={20} className="text-purple-200" />
            <span className="text-sm text-purple-200">Accuracy</span>
          </div>
          <div className={`text-3xl font-bold ${getAccuracyColor(accuracyPercent)}`}>
            {accuracyPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-purple-200 mt-1">
            {mlStats.correct_predictions}/{mlStats.total_classified} correct
          </div>
        </div>

        {/* Confidence */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={20} className="text-purple-200" />
            <span className="text-sm text-purple-200">Confidence</span>
          </div>
          <div className="text-3xl font-bold text-blue-300">
            {confidencePercent.toFixed(1)}%
          </div>
          <div className="text-xs text-purple-200 mt-1">
            Average prediction
          </div>
        </div>

        {/* Total Classified */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-purple-200" />
              <span className="text-sm text-purple-200">Total Classified</span>
            </div>
            <div className="text-2xl font-bold">
              {mlStats.total_classified}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicator */}
      {accuracyPercent >= 88 && (
        <div className="mt-4 bg-green-500 bg-opacity-20 border border-green-400 rounded-lg p-3">
          <p className="text-sm text-center font-semibold">
            ✨ Exceeding target accuracy (88%+)
          </p>
        </div>
      )}

      {accuracyPercent < 88 && accuracyPercent > 0 && (
        <div className="mt-4 bg-yellow-500 bg-opacity-20 border border-yellow-400 rounded-lg p-3">
          <p className="text-sm text-center font-semibold">
            📊 Target: 88% accuracy
          </p>
        </div>
      )}
    </div>
  );
};

export default MLInsightsCard;