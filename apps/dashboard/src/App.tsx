import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Cpu,
  Activity,
  Radio,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useStore } from './store/useStore';
import { DeviceCard } from './components/DeviceCard';
import { Gauge } from './components/Gauge';
import { RealtimeChart } from './components/RealtimeChart';
import { DebugConsole } from './components/DebugConsole';
import { SensorDataPanel } from './components/SensorDataPanel';
import { DeviceConfigModal } from './components/DeviceConfigModal';

function Header() {
  const { devices, openConfigModal } = useStore();

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const totalCount = devices.length;

  return (
    <header className="glass border-b border-industrial-700 sticky top-0 z-40">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="p-2 rounded-lg bg-gradient-to-br from-cyan/20 to-amber/20"
          >
            <Zap className="w-6 h-6 text-cyan" />
          </motion.div>

          <div>
            <h1 className="text-xl font-display font-bold text-white tracking-tight">
              AUTO INDUSTRY
            </h1>
            <p className="text-xs font-mono text-industrial-400">
              Industrial Protocol Gateway Control Center
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-6">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-alert-green animate-pulse" />
            <span className="text-sm font-mono text-industrial-300">
              {onlineCount}/{totalCount} Online
            </span>
          </div>

          {/* Protocol Stats */}
          <div className="hidden md:flex items-center gap-4">
            {['mqtt', 'modbus', 'opcua', 's7'].map((protocol) => {
              const count = devices.filter((d) => d.protocol === protocol).length;
              const colors = {
                mqtt: 'text-cyan',
                modbus: 'text-amber',
                opcua: 'text-alert-green',
                s7: 'text-purple-400',
              };
              return (
                <div key={protocol} className="flex items-center gap-1">
                  <span className={`text-xs font-mono uppercase ${colors[protocol as keyof typeof colors]}`}>
                    {protocol}
                  </span>
                  <span className="text-xs font-mono text-industrial-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Add Device Button */}
          <button
            onClick={() => openConfigModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan/20 text-cyan font-mono text-sm hover:bg-cyan/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Device</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusBar() {
  const { addLog } = useStore();

  useEffect(() => {
    // Simulate periodic data updates
    const interval = setInterval(() => {
      addLog({
        level: 'debug',
        message: `Data refresh: ${Math.floor(Math.random() * 100)} points updated`,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [addLog]);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 glass border-t border-industrial-700 flex items-center px-4 text-xs font-mono z-40">
      <div className="flex items-center gap-2 text-industrial-400">
        <Radio className="w-3 h-3 text-alert-green animate-pulse" />
        <span>System Running</span>
      </div>
      <div className="ml-auto text-industrial-500">
        {new Date().toLocaleString()}
      </div>
    </div>
  );
}

export default function App() {
  const { devices, updateSensorData, addLog, addChartData, sensorData } = useStore();

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      updateSensorData();

      // Add chart data for connected devices
      const onlineDevices = devices.filter((d) => d.status === 'online');
      onlineDevices.forEach((device) => {
        const data = sensorData.find((s) => s.deviceId === device.id);
        if (data && typeof data.value === 'number') {
          addChartData(device.id, data.address, data.value);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [devices, updateSensorData, addChartData, sensorData]);

  // Generate chart data for display
  const temperatureData = Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - (19 - i) * 1000),
    value: 25 + Math.sin(i * 0.5) * 2 + Math.random() * 0.5,
  }));

  const humidityData = Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - (19 - i) * 1000),
    value: 60 + Math.cos(i * 0.3) * 5 + Math.random() * 2,
  }));

  return (
    <div className="min-h-screen bg-industrial-900 noise">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="p-6 pb-12">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Devices */}
          <section className="col-span-12 lg:col-span-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-mono text-industrial-400 uppercase tracking-wider">
                Devices
              </h2>
              <div className="flex items-center gap-2 text-xs text-industrial-500">
                <Cpu className="w-3 h-3" />
                <span>{devices.length} configured</span>
              </div>
            </div>

            <div className="space-y-4">
              {devices.map((device, index) => (
                <DeviceCard key={device.id} device={device} index={index} />
              ))}
            </div>
          </section>

          {/* Center Column - Visualizations */}
          <section className="col-span-12 lg:col-span-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-mono text-industrial-400 uppercase tracking-wider">
                Real-time Monitoring
              </h2>
              <button
                onClick={updateSensorData}
                className="flex items-center gap-1 text-xs text-industrial-500 hover:text-cyan transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Gauges Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Gauge
                config={{
                  min: 0,
                  max: 50,
                  value: 25.5 + Math.random() * 2,
                  unit: '°C',
                  label: 'Temperature',
                  thresholds: { warning: 35, critical: 45 },
                }}
              />
              <Gauge
                config={{
                  min: 0,
                  max: 100,
                  value: 60 + Math.random() * 10,
                  unit: '%',
                  label: 'Humidity',
                  thresholds: { warning: 80, critical: 95 },
                }}
              />
            </div>

            {/* Charts */}
            <div className="space-y-4">
              <RealtimeChart
                data={temperatureData}
                title="Temperature Trend"
                color="#22c55e"
                unit="°C"
              />
              <RealtimeChart
                data={humidityData}
                title="Humidity Trend"
                color="#06b6d4"
                unit="%"
              />
            </div>
          </section>

          {/* Right Column - Data & Console */}
          <section className="col-span-12 lg:col-span-3 space-y-6">
            {/* Sensor Data */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-mono text-industrial-400 uppercase tracking-wider">
                  Sensor Data
                </h2>
                <Activity className="w-3 h-3 text-cyan animate-pulse" />
              </div>
              <SensorDataPanel />
            </div>

            {/* Debug Console */}
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-mono text-industrial-400 uppercase tracking-wider">
                  Debug Console
                </h2>
              </div>
              <DebugConsole />
            </div>
          </section>
        </div>
      </main>

      {/* Status Bar */}
      <StatusBar />

      {/* Modal */}
      <DeviceConfigModal />
    </div>
  );
}
