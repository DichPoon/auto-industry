/**
 * Modbus Protocol Adapter
 * Supports Modbus TCP and RTU
 */

import type {
  ProtocolAdapter,
  DeviceConfig,
  DeviceStatus,
  DeviceValue,
  DataCallback,
  ReadOptions,
  WriteOptions,
  SubscribeOptions,
  BrowseResult,
  ProtocolType,
} from '@auto-industry/core';
import { DEFAULT_DEVICE_TIMEOUT } from '@auto-industry/core';

// Modbus address types
type ModbusAddressType = 'coil' | 'discrete' | 'holding' | 'input';

interface ModbusAddress {
  type: ModbusAddressType;
  address: number;
  quantity?: number;
}

/**
 * Parse Modbus address string
 */
function parseModbusAddress(addr: string): ModbusAddress {
  const parts = addr.toUpperCase().split(':');

  let type: ModbusAddressType;
  const typeStr = parts[0];

  switch (typeStr) {
    case 'C':
    case 'COIL':
    case '0X':
      type = 'coil';
      break;
    case 'DI':
    case 'DISCRETE':
    case '1X':
      type = 'discrete';
      break;
    case 'HR':
    case 'HOLDING':
    case '4X':
      type = 'holding';
      break;
    case 'IR':
    case 'INPUT':
    case '3X':
      type = 'input';
      break;
    default:
      if (addr.startsWith('0')) type = 'coil';
      else if (addr.startsWith('1')) type = 'discrete';
      else if (addr.startsWith('3')) type = 'input';
      else if (addr.startsWith('4')) type = 'holding';
      else throw new Error(`Unknown Modbus address type: ${typeStr}`);
  }

  const address = parseInt(parts[1], 10);
  if (isNaN(address)) {
    throw new Error(`Invalid Modbus address: ${parts[1]}`);
  }

  const quantity = parts[2] ? parseInt(parts[2], 10) : 1;

  return { type, address, quantity };
}

/**
 * Modbus TCP Configuration
 */
interface ModbusTcpConfig extends DeviceConfig {
  host: string;
  port: number;
  unitId: number;
}

/**
 * Modbus Adapter (Simplified)
 * Implements ProtocolAdapter for Modbus TCP
 */
export class ModbusAdapter implements ProtocolAdapter {
  readonly protocol: ProtocolType = 'modbus';
  readonly name = 'Modbus TCP/RTU Adapter';
  readonly version = '0.1.0';

  private socket: any = null;
  private client: any = null;
  private config: ModbusTcpConfig | null = null;
  private subscriptions: Map<string, NodeJS.Timeout> = new Map();
  private subscriptionCallbacks: Map<string, DataCallback> = new Map();
  private connectionStatus: DeviceStatus['status'] = 'disconnected';
  private lastError: string | undefined;
  private metrics = {
    readCount: 0,
    writeCount: 0,
    errorCount: 0,
    totalLatency: 0,
    lastLatency: 0,
  };

  async connect(config: DeviceConfig): Promise<void> {
    this.config = config as ModbusTcpConfig;
    const timeout = config.timeout || DEFAULT_DEVICE_TIMEOUT;

    try {
      this.connectionStatus = 'connecting';

      // Dynamic import for modbus
      const Modbus = require('jsmodbus');
      const net = require('net');

      // Create socket
      this.socket = new net.Socket();

      // Create Modbus client
      this.client = new Modbus.ModbusTCPClient(
        this.socket,
        this.config.unitId || 1
      );

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, timeout);

        this.socket.connect(
          this.config!.port || 502,
          this.config!.host,
          () => {
            clearTimeout(timeoutId);
            resolve();
          }
        );

        this.socket.on('error', (err: Error) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });

      this.connectionStatus = 'connected';
      this.lastError = undefined;
    } catch (error) {
      this.connectionStatus = 'error';
      this.lastError = (error as Error).message;
      this.metrics.errorCount++;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Stop all subscriptions
    for (const [, timer] of this.subscriptions) {
      clearInterval(timer);
    }
    this.subscriptions.clear();
    this.subscriptionCallbacks.clear();

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.client = null;
    }

    this.connectionStatus = 'disconnected';
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.socket !== null;
  }

  async read(address: string, _options?: ReadOptions): Promise<DeviceValue> {
    if (!this.isConnected() || !this.client) {
      throw new Error('Not connected to device');
    }

    const startTime = Date.now();
    const modbusAddr = parseModbusAddress(address);
    const quantity = modbusAddr.quantity || 1;

    try {
      let response: any;

      switch (modbusAddr.type) {
        case 'coil':
          response = await this.client.readCoils(modbusAddr.address, quantity);
          break;
        case 'discrete':
          response = await this.client.readDiscreteInputs(modbusAddr.address, quantity);
          break;
        case 'holding':
          response = await this.client.readHoldingRegisters(modbusAddr.address, quantity);
          break;
        case 'input':
          response = await this.client.readInputRegisters(modbusAddr.address, quantity);
          break;
        default:
          throw new Error(`Unknown Modbus address type: ${modbusAddr.type}`);
      }

      const values = response.response.body.values;

      // Update metrics
      this.metrics.readCount++;
      this.metrics.lastLatency = Date.now() - startTime;
      this.metrics.totalLatency += this.metrics.lastLatency;

      return quantity === 1 ? values[0] : Array.from(values as ArrayLike<number>);
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async write(address: string, value: DeviceValue, _options?: WriteOptions): Promise<void> {
    if (!this.isConnected() || !this.client) {
      throw new Error('Not connected to device');
    }

    const startTime = Date.now();
    const modbusAddr = parseModbusAddress(address);

    try {
      if (modbusAddr.type === 'coil') {
        const boolValue = Boolean(value);
        await this.client.writeSingleCoil(modbusAddr.address, boolValue);
      } else if (modbusAddr.type === 'holding') {
        const numValue = typeof value === 'number' ? value : parseInt(String(value), 10);
        await this.client.writeSingleRegister(modbusAddr.address, numValue);
      } else {
        throw new Error(`Cannot write to ${modbusAddr.type} address`);
      }

      // Update metrics
      this.metrics.writeCount++;
      this.metrics.lastLatency = Date.now() - startTime;
      this.metrics.totalLatency += this.metrics.lastLatency;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async subscribe(address: string, callback: DataCallback, options?: SubscribeOptions): Promise<void> {
    if (this.subscriptions.has(address)) {
      throw new Error(`Already subscribed to ${address}`);
    }

    this.subscriptionCallbacks.set(address, callback);

    // Create polling interval
    const interval = options?.interval || 1000;
    const timer = setInterval(async () => {
      try {
        const value = await this.read(address);
        callback({
          deviceId: this.config?.deviceId || 'unknown',
          address,
          value,
          timestamp: new Date(),
          quality: 'good',
        });
      } catch {
        callback({
          deviceId: this.config?.deviceId || 'unknown',
          address,
          value: 0 as DeviceValue,
          timestamp: new Date(),
          quality: 'bad',
        });
      }
    }, interval);

    this.subscriptions.set(address, timer);
  }

  async unsubscribe(address: string): Promise<void> {
    const timer = this.subscriptions.get(address);
    if (timer) {
      clearInterval(timer);
      this.subscriptions.delete(address);
      this.subscriptionCallbacks.delete(address);
    }
  }

  getDeviceStatus(): DeviceStatus {
    return {
      deviceId: this.config?.deviceId || 'unknown',
      protocol: this.protocol,
      status: this.connectionStatus,
      lastSeen: this.connectionStatus === 'connected' ? new Date() : undefined,
      error: this.lastError,
      metrics: {
        readCount: this.metrics.readCount,
        writeCount: this.metrics.writeCount,
        errorCount: this.metrics.errorCount,
        avgLatencyMs: this.metrics.readCount + this.metrics.writeCount > 0
          ? this.metrics.totalLatency / (this.metrics.readCount + this.metrics.writeCount)
          : 0,
        lastLatencyMs: this.metrics.lastLatency,
      },
    };
  }

  browse(_path?: string): Promise<BrowseResult[]> {
    return Promise.resolve([
      { name: 'Coils (0x)', address: 'coil:0', dataType: 'bool', access: 'readwrite' },
      { name: 'Discrete Inputs (1x)', address: 'discrete:0', dataType: 'bool', access: 'read' },
      { name: 'Input Registers (3x)', address: 'input:0', dataType: 'uint16', access: 'read' },
      { name: 'Holding Registers (4x)', address: 'holding:0', dataType: 'uint16', access: 'readwrite' },
    ]);
  }

  onError(_callback: (error: Error) => void): void {
    // Error handling through socket events
  }
}

// Export factory function
export function createModbusAdapter(): ProtocolAdapter {
  return new ModbusAdapter();
}
