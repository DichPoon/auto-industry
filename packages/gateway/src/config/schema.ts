/**
 * Configuration schema using Zod
 */

import { z } from 'zod';

// Reconnect configuration schema
export const ReconnectConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).default(10),
  initialDelayMs: z.number().int().min(100).default(1000),
  maxDelayMs: z.number().int().min(1000).default(30000),
  backoffMultiplier: z.number().min(1).default(2),
});

// Base device configuration schema
export const BaseDeviceConfigSchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().optional(),
  enabled: z.boolean().default(true),
  reconnect: ReconnectConfigSchema.optional(),
  timeout: z.number().int().min(100).default(5000),
});

// Modbus TCP configuration
export const ModbusTcpDeviceConfigSchema = BaseDeviceConfigSchema.extend({
  protocol: z.literal('modbus'),
  host: z.string(),
  port: z.number().int().min(1).max(65535).default(502),
  unitId: z.number().int().min(0).max(255).default(1),
});

// OPC UA configuration
export const OpcuaDeviceConfigSchema = BaseDeviceConfigSchema.extend({
  protocol: z.literal('opcua'),
  endpoint: z.string(),
  securityMode: z.enum(['None', 'Sign', 'SignAndEncrypt']).default('None'),
  securityPolicy: z.string().default('None'),
  username: z.string().optional(),
  password: z.string().optional(),
});

// MQTT configuration
export const MqttDeviceConfigSchema = BaseDeviceConfigSchema.extend({
  protocol: z.literal('mqtt'),
  broker: z.string(),
  port: z.number().int().min(1).max(65535).default(1883),
  username: z.string().optional(),
  password: z.string().optional(),
  clientId: z.string().optional(),
  clean: z.boolean().default(true),
  keepalive: z.number().int().min(0).default(60),
});

// S7 (Siemens) configuration
export const S7DeviceConfigSchema = BaseDeviceConfigSchema.extend({
  protocol: z.literal('s7'),
  host: z.string(),
  port: z.number().int().min(1).max(65535).default(102),
  rack: z.number().int().min(0).default(0),
  slot: z.number().int().min(0).default(1),
  plcType: z.enum(['S7-200', 'S7-300', 'S7-400', 'S7-1200', 'S7-1500']).default('S7-300'),
});

// Device configuration union
export const DeviceConfigSchema = z.discriminatedUnion('protocol', [
  ModbusTcpDeviceConfigSchema,
  OpcuaDeviceConfigSchema,
  MqttDeviceConfigSchema,
  S7DeviceConfigSchema,
]);

// Gateway configuration
export const GatewayConfigSchema = z.object({
  name: z.string().default('Auto Industry Gateway'),
  version: z.string().default('0.1.0'),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  devices: z.array(DeviceConfigSchema).default([]),
});

// Type exports
export type ModbusTcpDeviceConfig = z.infer<typeof ModbusTcpDeviceConfigSchema>;
export type OpcuaDeviceConfig = z.infer<typeof OpcuaDeviceConfigSchema>;
export type MqttDeviceConfig = z.infer<typeof MqttDeviceConfigSchema>;
export type S7DeviceConfig = z.infer<typeof S7DeviceConfigSchema>;
export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
