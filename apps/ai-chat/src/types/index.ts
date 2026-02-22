export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'success' | 'error';
}

export interface DeviceInfo {
  id: string;
  name: string;
  protocol: string;
  status: 'online' | 'offline' | 'connecting' | 'error';
  enabled: boolean;
}

export interface SensorReading {
  deviceId: string;
  address: string;
  value: number | string | boolean;
  unit?: string;
  timestamp: Date;
}
