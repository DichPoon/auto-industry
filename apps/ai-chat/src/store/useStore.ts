import { create } from 'zustand';
import type { ChatMessage, DeviceInfo } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

// Mock devices for demonstration
const mockDevices: DeviceInfo[] = [
  { id: 'mqtt-local', name: 'MQTT Broker', protocol: 'mqtt', status: 'online', enabled: true },
  { id: 'modbus-sim', name: 'Modbus TCP Simulator', protocol: 'modbus', status: 'offline', enabled: true },
  { id: 'opcua-server', name: 'OPC UA Server', protocol: 'opcua', status: 'offline', enabled: false },
  { id: 's7-plc', name: 'Siemens S7 PLC', protocol: 's7', status: 'offline', enabled: false },
];

interface AppState {
  // Chat
  messages: ChatMessage[];
  isTyping: boolean;

  // Devices
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;

  // API Key
  apiKey: string;
  isApiKeySet: boolean;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  setTyping: (isTyping: boolean) => void;
  setSelectedDevice: (device: DeviceInfo | null) => void;
  updateDeviceStatus: (deviceId: string, status: DeviceInfo['status']) => void;

  setApiKey: (key: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial State
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 你好！我是工业协议网关的 AI 助手。

我可以帮助你：
- 📊 **查看设备状态** - 询问任何设备的连接状态
- 📈 **读取传感器数据** - 获取实时温度、湿度等数据
- ⚙️ **控制设备** - 连接/断开设备，写入数据
- 🔍 **诊断问题** - 分析设备故障原因

**当前在线设备**:
${mockDevices.filter(d => d.status === 'online').map(d => `- ${d.name} (${d.protocol.toUpperCase()})`).join('\n') || '- 暂无在线设备'}

试着问我："读取MQTT设备的温度数据"`,
      timestamp: new Date(),
    },
  ],
  isTyping: false,
  devices: mockDevices,
  selectedDevice: null,
  apiKey: '',
  isApiKeySet: false,

  // Actions
  addMessage: (message) => {
    const id = generateId();
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };

    set((state) => ({ messages: [...state.messages, newMessage] }));
    return id;
  },

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  clearMessages: () =>
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: '聊天已清空。有什么我可以帮助你的吗？',
          timestamp: new Date(),
        },
      ],
    }),

  setTyping: (isTyping) => set({ isTyping }),

  setSelectedDevice: (device) => set({ selectedDevice: device }),

  updateDeviceStatus: (deviceId, status) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, status } : d
      ),
    })),

  setApiKey: (key) => set({ apiKey: key, isApiKeySet: !!key }),
}));
