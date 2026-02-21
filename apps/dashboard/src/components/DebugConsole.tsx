import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Trash2, Filter } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { LogEntry } from '../types';

const levelColors = {
  debug: 'text-industrial-400',
  info: 'text-cyan',
  warn: 'text-alert-yellow',
  error: 'text-alert-red',
};

const levelBgColors = {
  debug: 'bg-industrial-700/50',
  info: 'bg-cyan/10',
  warn: 'bg-alert-yellow/10',
  error: 'bg-alert-red/10',
};

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 py-1.5 px-2 rounded font-mono text-xs ${levelBgColors[entry.level]}`}
    >
      {/* Timestamp */}
      <span className="text-industrial-500 shrink-0">
        {entry.timestamp.toLocaleTimeString('en-US', { hour12: false })}
      </span>

      {/* Level */}
      <span
        className={`uppercase w-12 shrink-0 ${levelColors[entry.level]}`}
      >
        [{entry.level}]
      </span>

      {/* Device ID */}
      {entry.deviceId && (
        <span className="text-amber shrink-0">
          [{entry.deviceId}]
        </span>
      )}

      {/* Message */}
      <span className="text-industrial-200 flex-1">
        {entry.message}
      </span>
    </motion.div>
  );
}

export function DebugConsole() {
  const { logs, clearLogs } = useStore();
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs =
    filter === 'all' ? logs : logs.filter((log) => log.level === filter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-dark rounded-lg h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-industrial-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan" />
          <span className="text-sm font-mono text-industrial-200">
            Debug Console
          </span>
          <span className="text-xs text-industrial-500">
            ({filteredLogs.length} entries)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-industrial-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-industrial-800 border border-industrial-600 rounded px-2 py-1 text-xs font-mono text-industrial-300 focus:outline-none focus:border-cyan"
            >
              <option value="all">All</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Clear */}
          <button
            onClick={clearLogs}
            className="p-1.5 rounded hover:bg-industrial-700 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4 text-industrial-400 hover:text-alert-red" />
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1"
        style={{ maxHeight: '300px' }}
      >
        <AnimatePresence initial={false}>
          {filteredLogs.length === 0 ? (
            <div className="text-center text-industrial-500 py-8 font-mono text-sm">
              No logs to display
            </div>
          ) : (
            filteredLogs.map((entry) => (
              <LogLine key={entry.id} entry={entry} />
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
