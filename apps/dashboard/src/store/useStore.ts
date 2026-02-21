import { create } from 'zustand';
import type { Device, SensorData, LogEntry, ConnectionStatus } from '../types';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Initial mock devices
const initialDevices: Device[] = [
  {
    id: 'mqtt-local',
    name: 'MQTT Broker',
    protocol: 'mqtt',
    status: 'online',
    enabled: true,
    config: { broker: 'mqtt://localhost', port: 1883 },
    lastSeen: new Date(),
  },
  {
    id: 'modbus-sim',
    name: 'Modbus TCP Simulator',
    protocol: 'modbus',
    status: 'offline',
    enabled: true,
    config: { host: 'localhost', port: 5020, unitId: 1 },
  },
  {
    id: 'opcua-server',
    name: 'OPC UA Server',
    protocol: 'opcua',
    status: 'offline',
    enabled: false,
    config: { endpoint: 'opc.tcp://localhost:4840' },
  },
  {
    id: 's7-plc',
    name: 'Siemens S7 PLC',
    protocol: 's7',
    status: 'offline',
    enabled: false,
    config: { host: '192.168.1.100', port: 102, rack: 0, slot: 1 },
  },
];

// Generate mock sensor data
const generateMockSensorData = (): SensorData[] => [
  {
    id: generateId(),
    deviceId: 'mqtt-local',
    address: 'sensor/temperature',
    value: 25.5 + Math.random() * 2 - 1,
    unit: '°C',
    timestamp: new Date(),
    quality: 'good',
  },
  {
    id: generateId(),
    deviceId: 'mqtt-local',
    address: 'sensor/humidity',
    value: Math.floor(60 + Math.random() * 10 - 5),
    unit: '%',
    timestamp: new Date(),
    quality: 'good',
  },
  {
    id: generateId(),
    deviceId: 'mqtt-local',
    address: 'sensor/pressure',
    value: 1013.25 + Math.random() * 5 - 2.5,
    unit: 'hPa',
    timestamp: new Date(),
    quality: 'good',
  },
  {
    id: generateId(),
    deviceId: 'modbus-sim',
    address: 'HR100',
    value: Math.floor(1500 + Math.random() * 100),
    unit: 'RPM',
    timestamp: new Date(),
    quality: 'good',
  },
  {
    id: generateId(),
    deviceId: 'modbus-sim',
    address: 'HR101',
    value: Math.floor(75 + Math.random() * 10),
    unit: '%',
    timestamp: new Date(),
    quality: 'good',
  },
];

interface AppState {
  // Devices
  devices: Device[];
  selectedDevice: Device | null;

  // Data
  sensorData: SensorData[];
  chartData: Map<string, { timestamp: Date; value: number }[]>;

  // Logs
  logs: LogEntry[];
  maxLogs: number;

  // UI State
  isConfigModalOpen: boolean;
  editingDevice: Device | null;

  // Actions
  setSelectedDevice: (device: Device | null) => void;
  updateDeviceStatus: (deviceId: string, status: ConnectionStatus) => void;
  toggleDevice: (deviceId: string) => void;
  connectDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  addDevice: (device: Omit<Device, 'id' | 'status'>) => void;
  removeDevice: (deviceId: string) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;

  // Data Actions
  updateSensorData: () => void;
  addChartData: (deviceId: string, address: string, value: number) => void;

  // Log Actions
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  // UI Actions
  openConfigModal: (device?: Device) => void;
  closeConfigModal: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial State
  devices: initialDevices,
  selectedDevice: null,
  sensorData: generateMockSensorData(),
  chartData: new Map(),
  logs: [
    {
      id: generateId(),
      timestamp: new Date(Date.now() - 5000),
      level: 'info',
      message: 'System initialized',
    },
    {
      id: generateId(),
      timestamp: new Date(Date.now() - 4000),
      level: 'info',
      message: 'MQTT Broker connected',
      deviceId: 'mqtt-local',
    },
    {
      id: generateId(),
      timestamp: new Date(Date.now() - 3000),
      level: 'debug',
      message: 'Subscribed to sensor/#',
      deviceId: 'mqtt-local',
    },
    {
      id: generateId(),
      timestamp: new Date(Date.now() - 2000),
      level: 'info',
      message: 'Receiving data from sensor/temperature',
      deviceId: 'mqtt-local',
    },
  ],
  maxLogs: 100,
  isConfigModalOpen: false,
  editingDevice: null,

  // Device Actions
  setSelectedDevice: (device) => set({ selectedDevice: device }),

  updateDeviceStatus: (deviceId, status) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, status, lastSeen: new Date() } : d
      ),
    })),

  toggleDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, enabled: !d.enabled } : d
      ),
    })),

  connectDevice: async (deviceId) => {
    const { updateDeviceStatus, addLog } = get();
    const device = get().devices.find((d) => d.id === deviceId);

    if (!device) return;

    updateDeviceStatus(deviceId, 'connecting');
    addLog({
      level: 'info',
      message: `Connecting to ${device.name}...`,
      deviceId,
    });

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      updateDeviceStatus(deviceId, 'online');
      addLog({
        level: 'info',
        message: `Connected to ${device.name}`,
        deviceId,
      });
    } else {
      updateDeviceStatus(deviceId, 'error');
      addLog({
        level: 'error',
        message: `Failed to connect to ${device.name}: Connection timeout`,
        deviceId,
      });
    }
  },

  disconnectDevice: async (deviceId) => {
    const { updateDeviceStatus, addLog } = get();
    const device = get().devices.find((d) => d.id === deviceId);

    if (!device) return;

    await new Promise((resolve) => setTimeout(resolve, 500));

    updateDeviceStatus(deviceId, 'offline');
    addLog({
      level: 'info',
      message: `Disconnected from ${device.name}`,
      deviceId,
    });
  },

  addDevice: (deviceData) => {
    const { addLog } = get();
    const newDevice: Device = {
      ...deviceData,
      id: generateId(),
      status: 'offline',
    };

    set((state) => ({ devices: [...state.devices, newDevice] }));
    addLog({
      level: 'info',
      message: `Added new device: ${deviceData.name}`,
      deviceId: newDevice.id,
    });
  },

  removeDevice: (deviceId) => {
    const { addLog } = get();
    const device = get().devices.find((d) => d.id === deviceId);

    set((state) => ({
      devices: state.devices.filter((d) => d.id !== deviceId),
      selectedDevice: state.selectedDevice?.id === deviceId ? null : state.selectedDevice,
    }));

    if (device) {
      addLog({
        level: 'info',
        message: `Removed device: ${device.name}`,
        deviceId,
      });
    }
  },

  updateDevice: (deviceId, updates) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, ...updates } : d
      ),
    })),

  // Data Actions
  updateSensorData: () => set({ sensorData: generateMockSensorData() }),

  addChartData: (deviceId, address, value) =>
    set((state) => {
      const key = `${deviceId}:${address}`;
      const chartData = new Map(state.chartData);
      const existing = chartData.get(key) || [];

      // Keep last 50 data points
      const newData = [...existing, { timestamp: new Date(), value }].slice(-50);
      chartData.set(key, newData);

      return { chartData };
    }),

  // Log Actions
  addLog: (entry) =>
    set((state) => {
      const newLog: LogEntry = {
        ...entry,
        id: generateId(),
        timestamp: new Date(),
      };

      const logs = [...state.logs, newLog];
      if (logs.length > state.maxLogs) {
        logs.shift();
      }

      return { logs };
    }),

  clearLogs: () => set({ logs: [] }),

  // UI Actions
  openConfigModal: (device) =>
    set({ isConfigModalOpen: true, editingDevice: device || null }),

  closeConfigModal: () => set({ isConfigModalOpen: false, editingDevice: null }),
}));
