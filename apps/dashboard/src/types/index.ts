export type ProtocolType = 'mqtt' | 'modbus' | 'opcua' | 's7';

export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'error';

export interface Device {
  id: string;
  name: string;
  protocol: ProtocolType;
  status: ConnectionStatus;
  enabled: boolean;
  config: Record<string, unknown>;
  lastSeen?: Date;
  error?: string;
}

export interface SensorData {
  id: string;
  deviceId: string;
  address: string;
  value: number | string | boolean;
  unit?: string;
  timestamp: Date;
  quality: 'good' | 'bad' | 'uncertain';
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  deviceId?: string;
  details?: Record<string, unknown>;
}

export interface GaugeConfig {
  min: number;
  max: number;
  value: number;
  unit: string;
  label: string;
  thresholds?: {
    warning: number;
    critical: number;
  };
}

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
}
