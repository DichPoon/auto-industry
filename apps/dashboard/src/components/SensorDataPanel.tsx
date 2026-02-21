import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useStore } from '../store/useStore';

const qualityColors = {
  good: 'text-alert-green',
  bad: 'text-alert-red',
  uncertain: 'text-alert-yellow',
};

export function SensorDataPanel() {
  const { sensorData } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-dark rounded-lg h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-industrial-700">
        <Activity className="w-4 h-4 text-cyan" />
        <span className="text-sm font-mono text-industrial-200">Live Sensor Data</span>
        <span className="ml-auto text-xs text-industrial-500">
          {sensorData.length} points
        </span>
      </div>

      {/* Data List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sensorData.map((data, index) => (
          <motion.div
            key={data.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className="flex items-center justify-between p-2 rounded bg-industrial-800/50 hover:bg-industrial-700/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              {/* Address */}
              <div className="text-xs font-mono text-amber truncate">
                {data.address}
              </div>
              {/* Device */}
              <div className="text-xs text-industrial-500 truncate">
                {data.deviceId}
              </div>
            </div>

            {/* Value */}
            <div className="text-right ml-4">
              <div className="font-mono text-sm text-white data-value">
                {typeof data.value === 'number'
                  ? data.value.toFixed(2)
                  : String(data.value)}
                {data.unit && (
                  <span className="text-industrial-500 ml-1">{data.unit}</span>
                )}
              </div>
              {/* Quality */}
              <div className={`text-xs ${qualityColors[data.quality]}`}>
                {data.quality}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
