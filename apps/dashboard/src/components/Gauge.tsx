import { motion } from 'framer-motion';
import type { GaugeConfig } from '../types';

export function Gauge({ config }: { config: GaugeConfig }) {
  const { min, max, value, unit, label, thresholds } = config;

  const percentage = ((value - min) / (max - min)) * 100;
  const angle = (percentage / 100) * 180 - 90;

  // Determine color based on thresholds
  const getColor = () => {
    if (typeof value !== 'number') return '#06b6d4';
    if (thresholds) {
      if (value >= thresholds.critical) return '#ef4444';
      if (value >= thresholds.warning) return '#eab308';
    }
    return '#22c55e';
  };

  const color = getColor();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-dark rounded-lg p-4 flex flex-col items-center"
    >
      {/* Label */}
      <div className="text-xs font-mono text-industrial-400 uppercase tracking-wider mb-2">
        {label}
      </div>

      {/* Gauge SVG */}
      <div className="relative w-32 h-20">
        <svg viewBox="0 0 100 60" className="w-full h-full">
          {/* Background Arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="#1a1f28"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Value Arc */}
          <motion.path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 1.26} 126`}
            initial={{ strokeDasharray: '0 126' }}
            animate={{ strokeDasharray: `${percentage * 1.26} 126` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />

          {/* Needle */}
          <motion.g
            transform={`rotate(${angle} 50 55)`}
            initial={{ rotate: -90 }}
            animate={{ rotate: angle }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <line
              x1="50"
              y1="55"
              x2="50"
              y2="25"
              stroke="#a8b5cc"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="50" cy="55" r="4" fill="#a8b5cc" />
          </motion.g>

          {/* Min/Max Labels */}
          <text x="8" y="58" className="text-[8px] fill-industrial-500 font-mono">
            {min}
          </text>
          <text x="88" y="58" className="text-[8px] fill-industrial-500 font-mono" textAnchor="end">
            {max}
          </text>
        </svg>
      </div>

      {/* Value Display */}
      <div className="mt-2 text-center">
        <span
          className="text-2xl font-mono font-bold data-value"
          style={{ color }}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-sm text-industrial-400 ml-1">{unit}</span>
      </div>
    </motion.div>
  );
}
