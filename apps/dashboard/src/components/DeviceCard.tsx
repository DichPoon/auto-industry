import { motion } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Loader2,
  Settings,
  Trash2,
  Power,
  RefreshCw,
} from 'lucide-react';
import type { Device } from '../types';
import { useStore } from '../store/useStore';

const protocolColors = {
  mqtt: 'text-cyan',
  modbus: 'text-amber',
  opcua: 'text-alert-green',
  s7: 'text-purple-400',
};

const protocolLabels = {
  mqtt: 'MQTT',
  modbus: 'Modbus TCP',
  opcua: 'OPC UA',
  s7: 'S7',
};

interface DeviceCardProps {
  device: Device;
  index: number;
}

export function DeviceCard({ device, index }: DeviceCardProps) {
  const { connectDevice, disconnectDevice, toggleDevice, removeDevice, openConfigModal } =
    useStore();

  const statusColors = {
    online: 'bg-alert-green',
    offline: 'bg-industrial-500',
    connecting: 'bg-alert-yellow',
    error: 'bg-alert-red',
  };

  const handleConnect = async () => {
    if (device.status === 'online') {
      await disconnectDevice(device.id);
    } else {
      await connectDevice(device.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`
        glass rounded-lg p-4 transition-all duration-300
        ${device.enabled ? 'animated-border' : 'opacity-60'}
        hover:border-industrial-400
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className={`status-glow ${device.status} relative`}>
            <div
              className={`
                w-3 h-3 rounded-full ${statusColors[device.status]}
                ${device.status === 'connecting' ? 'animate-pulse' : ''}
              `}
            />
          </div>

          {/* Protocol Badge */}
          <span
            className={`
              text-xs font-mono uppercase tracking-wider
              ${protocolColors[device.protocol]}
            `}
          >
            {protocolLabels[device.protocol]}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => openConfigModal(device)}
            className="p-1.5 rounded hover:bg-industrial-600 transition-colors"
          >
            <Settings className="w-4 h-4 text-industrial-300" />
          </button>
          <button
            onClick={() => toggleDevice(device.id)}
            className={`
              p-1.5 rounded transition-colors
              ${device.enabled ? 'text-cyan hover:bg-industrial-600' : 'text-industrial-500 hover:bg-industrial-600'}
            `}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Device Name */}
      <h3 className="font-display font-medium text-white mb-2 truncate">
        {device.name}
      </h3>

      {/* Device ID */}
      <p className="text-xs font-mono text-industrial-400 mb-3 truncate">
        {device.id}
      </p>

      {/* Connection Info */}
      <div className="text-xs font-mono text-industrial-300 space-y-1 mb-4">
        {device.protocol === 'mqtt' && (
          <div className="flex items-center gap-2">
            <span className="text-industrial-500">broker:</span>
            <span>{device.config.broker as string}:{device.config.port as number}</span>
          </div>
        )}
        {device.protocol === 'modbus' && (
          <div className="flex items-center gap-2">
            <span className="text-industrial-500">host:</span>
            <span>{device.config.host as string}:{device.config.port as number}</span>
          </div>
        )}
        {device.protocol === 'opcua' && (
          <div className="flex items-center gap-2">
            <span className="text-industrial-500">endpoint:</span>
            <span className="truncate">{device.config.endpoint as string}</span>
          </div>
        )}
        {device.protocol === 's7' && (
          <div className="flex items-center gap-2">
            <span className="text-industrial-500">host:</span>
            <span>{device.config.host as string}:{device.config.port as number}</span>
          </div>
        )}
      </div>

      {/* Last Seen */}
      {device.lastSeen && (
        <div className="text-xs text-industrial-500 mb-4">
          Last seen: {device.lastSeen.toLocaleTimeString()}
        </div>
      )}

      {/* Error Message */}
      {device.error && (
        <div className="text-xs text-alert-red bg-alert-red/10 rounded px-2 py-1 mb-4">
          {device.error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleConnect}
          disabled={device.status === 'connecting'}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded
            font-mono text-sm transition-all duration-200
            ${
              device.status === 'online'
                ? 'bg-alert-red/20 text-alert-red hover:bg-alert-red/30'
                : device.status === 'connecting'
                ? 'bg-alert-yellow/20 text-alert-yellow cursor-wait'
                : 'bg-cyan/20 text-cyan hover:bg-cyan/30'
            }
          `}
        >
          {device.status === 'connecting' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting</span>
            </>
          ) : device.status === 'online' ? (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Disconnect</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span>Connect</span>
            </>
          )}
        </button>

        <button
          onClick={() => removeDevice(device.id)}
          className="p-2 rounded bg-industrial-700 hover:bg-alert-red/20 hover:text-alert-red transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
