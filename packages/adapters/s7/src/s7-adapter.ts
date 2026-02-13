/**
 * Siemens S7 Protocol Adapter
 * For S7-200, S7-300, S7-400, S7-1200, S7-1500 PLCs
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

// nodes7 doesn't have type definitions
const NodeS7 = require('nodes7');

/**
 * S7 PLC Types
 */
type PlcType = 'S7-200' | 'S7-300' | 'S7-400' | 'S7-1200' | 'S7-1500';

/**
 * S7 Configuration
 */
interface S7Config extends DeviceConfig {
  host: string;
  port: number;
  rack: number;
  slot: number;
  plcType: PlcType;
}

/**
 * S7 Address Format
 * Examples:
 * - DB1,X0.0      (DB1, byte 0, bit 0 - Boolean)
 * - DB1,B0        (DB1, byte 0 - Byte)
 * - DB1,W0        (DB1, word 0 - Word)
 * - DB1,D0        (DB1, dword 0 - DWord)
 * - DB1,REAL0     (DB1, real starting at 0 - Float)
 * - M10.0         (Merker/Mark byte 10, bit 0)
 * - I0.0          (Input byte 0, bit 0)
 * - Q0.0          (Output byte 0, bit 0)
 */

/**
 * S7 Adapter
 * Implements ProtocolAdapter for Siemens S7 PLCs
 */
export class S7Adapter implements ProtocolAdapter {
  readonly protocol: ProtocolType = 's7';
  readonly name = 'Siemens S7 Adapter';
  readonly version = '0.1.0';

  private plc: any = null;
  private config: S7Config | null = null;
  private subscriptions: Map<string, NodeJS.Timeout> = new Map();
  private subscriptionCallbacks: Map<string, DataCallback[]> = new Map();
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
    this.config = config as S7Config;

    try {
      this.connectionStatus = 'connecting';

      // Create PLC instance
      this.plc = new NodeS7();
      this.plc.initiateConnection(
        {
          port: this.config.port || 102,
          host: this.config.host,
          rack: this.config.rack || 0,
          slot: this.config.slot || 1,
        },
        (err: Error | null) => {
          if (err) {
            this.connectionStatus = 'error';
            this.lastError = err.message;
            this.metrics.errorCount++;
          } else {
            this.connectionStatus = 'connected';
            this.lastError = undefined;
          }
        }
      );

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, config.timeout || DEFAULT_DEVICE_TIMEOUT);

        const checkInterval = setInterval(() => {
          if (this.connectionStatus === 'connected') {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          } else if (this.connectionStatus === 'error') {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            reject(new Error(this.lastError || 'Connection failed'));
          }
        }, 100);
      });
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

    // Drop connection
    if (this.plc) {
      this.plc.dropConnection();
      this.plc = null;
    }

    this.connectionStatus = 'disconnected';
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.plc !== null;
  }

  async read(address: string, _options?: ReadOptions): Promise<DeviceValue> {
    if (!this.isConnected() || !this.plc) {
      throw new Error('Not connected to PLC');
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Add variable to read list
      this.plc.addItems(address);

      // Read all items
      this.plc.readAllItems((err: Error | null, values: Record<string, DeviceValue>) => {
        if (err) {
          this.metrics.errorCount++;
          reject(err);
        } else {
          this.metrics.readCount++;
          this.metrics.lastLatency = Date.now() - startTime;
          this.metrics.totalLatency += this.metrics.lastLatency;
          resolve(values[address]);
        }
      });
    });
  }

  async readMany(addresses: string[], _options?: ReadOptions): Promise<Map<string, DeviceValue>> {
    if (!this.isConnected() || !this.plc) {
      throw new Error('Not connected to PLC');
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Add all variables to read list
      for (const addr of addresses) {
        this.plc.addItems(addr);
      }

      // Read all items
      this.plc.readAllItems((err: Error | null, values: Record<string, DeviceValue>) => {
        if (err) {
          this.metrics.errorCount++;
          reject(err);
        } else {
          this.metrics.readCount++;
          this.metrics.lastLatency = Date.now() - startTime;
          this.metrics.totalLatency += this.metrics.lastLatency;

          const result = new Map<string, DeviceValue>();
          for (const addr of addresses) {
            result.set(addr, values[addr]);
          }
          resolve(result);
        }
      });
    });
  }

  async write(address: string, value: DeviceValue, _options?: WriteOptions): Promise<void> {
    if (!this.isConnected() || !this.plc) {
      throw new Error('Not connected to PLC');
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Write single item
      this.plc.writeItems(address, value, (err: Error | null) => {
        if (err) {
          this.metrics.errorCount++;
          reject(err);
        } else {
          this.metrics.writeCount++;
          this.metrics.lastLatency = Date.now() - startTime;
          this.metrics.totalLatency += this.metrics.lastLatency;
          resolve();
        }
      });
    });
  }

  async writeMany(values: Map<string, DeviceValue>, _options?: WriteOptions): Promise<void> {
    if (!this.isConnected() || !this.plc) {
      throw new Error('Not connected to PLC');
    }

    const startTime = Date.now();
    const addresses = Array.from(values.keys());
    const valueArray = Array.from(values.values());

    return new Promise((resolve, reject) => {
      this.plc.writeItems(addresses, valueArray, (err: Error | null) => {
        if (err) {
          this.metrics.errorCount++;
          reject(err);
        } else {
          this.metrics.writeCount += values.size;
          this.metrics.lastLatency = Date.now() - startTime;
          this.metrics.totalLatency += this.metrics.lastLatency;
          resolve();
        }
      });
    });
  }

  async subscribe(address: string, callback: DataCallback, options?: SubscribeOptions): Promise<void> {
    if (!this.subscriptions.has(address)) {
      this.subscriptions.set(address, setInterval(async () => {
        try {
          const value = await this.read(address);
          const callbacks = this.subscriptionCallbacks.get(address);
          if (callbacks) {
            const event = {
              deviceId: this.config?.deviceId || 'unknown',
              address,
              value,
              timestamp: new Date(),
              quality: 'good' as const,
            };
            for (const cb of callbacks) {
              cb(event);
            }
          }
        } catch {
          // Notify subscribers of error
          const callbacks = this.subscriptionCallbacks.get(address);
          if (callbacks) {
            const event = {
              deviceId: this.config?.deviceId || 'unknown',
              address,
              value: 0 as DeviceValue, // Use 0 instead of null
              timestamp: new Date(),
              quality: 'bad' as const,
            };
            for (const cb of callbacks) {
              cb(event);
            }
          }
        }
      }, options?.interval || 1000));

      this.subscriptionCallbacks.set(address, []);
    }

    this.subscriptionCallbacks.get(address)!.push(callback);
  }

  async unsubscribe(address: string): Promise<void> {
    const timer = this.subscriptions.get(address);
    if (timer) {
      clearInterval(timer);
      this.subscriptions.delete(address);
      this.subscriptionCallbacks.delete(address);
    }
  }

  browse(_path?: string): Promise<BrowseResult[]> {
    // S7 doesn't have browse capability - return common area types
    return Promise.resolve([
      { name: 'Data Blocks (DB)', address: 'DB', hasChildren: true, description: 'Data block memory area' },
      { name: 'Inputs (I/E)', address: 'I', hasChildren: true, description: 'Input memory area' },
      { name: 'Outputs (Q/A)', address: 'Q', hasChildren: true, description: 'Output memory area' },
      { name: 'Merker/Flags (M)', address: 'M', hasChildren: true, description: 'Flag memory area' },
      { name: 'Timers (T)', address: 'T', hasChildren: true, description: 'Timer memory area' },
      { name: 'Counters (C/Z)', address: 'C', hasChildren: true, description: 'Counter memory area' },
    ]);
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

  onError(_callback: (error: Error) => void): void {
    // nodes7 doesn't have built-in error events
    // Errors are handled in callbacks
  }
}

// Export factory function
export function createS7Adapter(): ProtocolAdapter {
  return new S7Adapter();
}
