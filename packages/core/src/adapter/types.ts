/**
 * Common types for industrial protocol adapters
 */

// Supported protocol types
export type ProtocolType = 'modbus' | 'opcua' | 'mqtt' | 's7';

// Device value types
export type DeviceValue =
  | boolean
  | number
  | string
  | Buffer
  | DeviceValue[]
  | { [key: string]: DeviceValue };

// Device connection status
export type DeviceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting';

// Device status information
export interface DeviceStatus {
  deviceId: string;
  protocol: ProtocolType;
  status: DeviceConnectionStatus;
  lastSeen?: Date;
  error?: string;
  metrics?: DeviceMetrics;
}

// Device performance metrics
export interface DeviceMetrics {
  readCount: number;
  writeCount: number;
  errorCount: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
}

// Device information
export interface DeviceInfo {
  deviceId: string;
  protocol: ProtocolType;
  name?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  address: string;
  port?: number;
  tags?: DeviceTag[];
}

// Device tag/point definition
export interface DeviceTag {
  name: string;
  address: string;
  dataType: DataType;
  description?: string;
  unit?: string;
  access: 'read' | 'write' | 'readwrite';
}

// Common data types
export type DataType =
  | 'bool'
  | 'int8' | 'int16' | 'int32' | 'int64'
  | 'uint8' | 'uint16' | 'uint32' | 'uint64'
  | 'float32' | 'float64'
  | 'string'
  | 'bytes'
  | 'array'
  | 'struct';

// Base device configuration
export interface DeviceConfig {
  deviceId: string;
  protocol: ProtocolType;
  name?: string;
  enabled?: boolean;
  reconnect?: ReconnectConfig;
  timeout?: number;
}

// Reconnection configuration
export interface ReconnectConfig {
  enabled: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Data change event
export interface DataChangeEvent {
  deviceId: string;
  address: string;
  value: DeviceValue;
  timestamp: Date;
  quality?: DataQuality;
}

// Data quality indicator
export type DataQuality = 'good' | 'bad' | 'uncertain';

// Data callback type
export type DataCallback = (event: DataChangeEvent) => void;

// Error callback type
export type ErrorCallback = (error: Error, deviceId: string) => void;

// Read options
export interface ReadOptions {
  timeout?: number;
  quality?: boolean;
}

// Write options
export interface WriteOptions {
  timeout?: number;
  confirm?: boolean;
}

// Subscribe options
export interface SubscribeOptions {
  interval?: number;
  deadband?: number;
  queueSize?: number;
}

// Default reconnect configuration
export const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  enabled: true,
  maxAttempts: 10,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// Default device timeout (ms)
export const DEFAULT_DEVICE_TIMEOUT = 5000;
