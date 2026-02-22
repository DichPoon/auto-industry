import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Cpu } from 'lucide-react';
import { useStore } from '../store/useStore';

const statusColors = {
  online: 'bg-alert-green',
  offline: 'bg-industrial-500',
  connecting: 'bg-alert-yellow animate-pulse',
  error: 'bg-alert-red',
};

const protocolColors = {
  mqtt: 'text-cyan',
  modbus: 'text-amber',
  opcua: 'text-alert-green',
  s7: 'text-purple-400',
};

export function DeviceSidebar() {
  const { devices, selectedDevice, setSelectedDevice, updateDeviceStatus } = useStore();

  const handleConnect = async (deviceId: string) => {
    updateDeviceStatus(deviceId, 'connecting');

    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    const device = devices.find(d => d.id === deviceId);
    if (device?.status === 'online') {
      updateDeviceStatus(deviceId, 'offline');
    } else {
      updateDeviceStatus(deviceId, 'online');
    }
  };

  return (
    <div className="glass-dark rounded-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-industrial-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan" />
            <span className="text-sm font-mono text-industrial-200">设备列表</span>
          </div>
          <span className="text-xs text-industrial-500">
            {devices.filter(d => d.status === 'online').length}/{devices.length} 在线
          </span>
        </div>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {devices.map((device, index) => (
          <motion.div
            key={device.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              p-3 rounded-lg cursor-pointer transition-all
              ${selectedDevice?.id === device.id
                ? 'bg-cyan/10 border border-cyan/30'
                : 'bg-industrial-800/50 hover:bg-industrial-700/50 border border-transparent'
              }
            `}
            onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
          >
            {/* Device Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {/* Status Indicator */}
                <div className={`w-2 h-2 rounded-full ${statusColors[device.status]}`} />

                {/* Protocol Badge */}
                <span className={`text-xs font-mono uppercase ${protocolColors[device.protocol]}`}>
                  {device.protocol}
                </span>
              </div>

              {/* Quick Connect */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnect(device.id);
                }}
                className="p-1 rounded hover:bg-industrial-600 transition-colors"
                title={device.status === 'online' ? '断开连接' : '连接'}
              >
                {device.status === 'connecting' ? (
                  <RefreshCw className="w-4 h-4 text-alert-yellow animate-spin" />
                ) : device.status === 'online' ? (
                  <WifiOff className="w-4 h-4 text-alert-red" />
                ) : (
                  <Wifi className="w-4 h-4 text-industrial-400 hover:text-cyan" />
                )}
              </button>
            </div>

            {/* Device Name */}
            <div className="font-mono text-sm text-white truncate">
              {device.name}
            </div>

            {/* Device ID */}
            <div className="text-xs text-industrial-500 font-mono truncate">
              {device.id}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-industrial-700">
        <button
          onClick={() => {
            devices.forEach(d => {
              if (d.enabled) {
                handleConnect(d.id);
              }
            });
          }}
          className="w-full py-2 rounded-lg bg-cyan/20 text-cyan font-mono text-sm hover:bg-cyan/30 transition-colors"
        >
          连接所有设备
        </button>
      </div>
    </div>
  );
}
