/**
 * MQTT Protocol Adapter
 * Lightweight IoT messaging protocol
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import type {
  ProtocolAdapter,
  DeviceConfig,
  DeviceStatus,
  DeviceValue,
  DataCallback,
  ReadOptions,
  WriteOptions,
  SubscribeOptions,
  ProtocolType,
} from '@auto-industry/core';
import { DEFAULT_DEVICE_TIMEOUT } from '@auto-industry/core';

/**
 * MQTT Configuration
 */
interface MqttConfig extends DeviceConfig {
  broker: string;
  port: number;
  username?: string;
  password?: string;
  clientId?: string;
  clean: boolean;
  keepalive: number;
}

/**
 * MQTT Adapter
 * Implements ProtocolAdapter for MQTT
 *
 * Note: MQTT is a pub/sub protocol, so "read" operations are
 * simulated by subscribing and caching the last known value.
 * "address" in MQTT context means "topic".
 */
export class MqttAdapter implements ProtocolAdapter {
  readonly protocol: ProtocolType = 'mqtt';
  readonly name = 'MQTT Adapter';
  readonly version = '0.1.0';

  private client: MqttClient | null = null;
  private config: MqttConfig | null = null;
  private subscriptions: Map<string, DataCallback[]> = new Map();
  private cachedValues: Map<string, { value: DeviceValue; timestamp: Date }> = new Map();
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
    this.config = config as MqttConfig;

    try {
      this.connectionStatus = 'connecting';

      const options: IClientOptions = {
        port: this.config.port || 1883,
        clientId: this.config.clientId || `auto-industry-${Date.now()}`,
        clean: this.config.clean ?? true,
        keepalive: this.config.keepalive || 60,
        reconnectPeriod: 1000,
        connectTimeout: config.timeout || DEFAULT_DEVICE_TIMEOUT,
      };

      if (this.config.username) {
        options.username = this.config.username;
      }
      if (this.config.password) {
        options.password = this.config.password;
      }

      // Create MQTT client
      this.client = mqtt.connect(this.config.broker, options);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, options.connectTimeout);

        this.client!.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client!.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Set up message handler
      this.client.on('message', (topic: string, payload: Buffer) => {
        this.handleMessage(topic, payload);
      });

      // Set up error handler
      this.client.on('error', (err) => {
        this.lastError = err.message;
        this.metrics.errorCount++;
      });

      // Set up disconnect handler
      this.client.on('close', () => {
        this.connectionStatus = 'disconnected';
      });

      // Set up reconnect handler
      this.client.on('reconnect', () => {
        this.connectionStatus = 'reconnecting';
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
    // Unsubscribe from all topics
    for (const [topic] of this.subscriptions) {
      this.client?.unsubscribe(topic);
    }
    this.subscriptions.clear();
    this.cachedValues.clear();

    // End connection
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.end(false, () => resolve());
      });
      this.client = null;
    }

    this.connectionStatus = 'disconnected';
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.client !== null && this.client.connected;
  }

  /**
   * Read the last known value from a topic
   * MQTT is pub/sub, so "read" returns cached value
   */
  async read(address: string, options?: ReadOptions): Promise<DeviceValue> {
    const startTime = Date.now();

    // Check if we have a cached value
    const cached = this.cachedValues.get(address);
    if (cached) {
      this.metrics.readCount++;
      this.metrics.lastLatency = Date.now() - startTime;
      this.metrics.totalLatency += this.metrics.lastLatency;
      return cached.value;
    }

    // No cached value - subscribe and wait for first message
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Read timeout for topic: ${address}`));
      }, options?.timeout || this.config?.timeout || DEFAULT_DEVICE_TIMEOUT);

      const tempCallback: DataCallback = (event) => {
        clearTimeout(timeout);
        this.metrics.readCount++;
        this.metrics.lastLatency = Date.now() - startTime;
        this.metrics.totalLatency += this.metrics.lastLatency;
        resolve(event.value);
      };

      // Subscribe temporarily
      this.subscribe(address, tempCallback).catch(reject);
    });
  }

  /**
   * Write (publish) a value to a topic
   */
  async write(address: string, value: DeviceValue, _options?: WriteOptions): Promise<void> {
    if (!this.isConnected() || !this.client) {
      throw new Error('Not connected to broker');
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const payload = this.valueToBuffer(value);

      this.client!.publish(address, payload, { qos: 1 }, (err) => {
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

  /**
   * Subscribe to a topic
   */
  async subscribe(address: string, callback: DataCallback, _options?: SubscribeOptions): Promise<void> {
    if (!this.isConnected() || !this.client) {
      throw new Error('Not connected to broker');
    }

    // Add callback to subscriptions
    if (!this.subscriptions.has(address)) {
      this.subscriptions.set(address, []);

      // Subscribe to topic
      await new Promise<void>((resolve, reject) => {
        this.client!.subscribe(address, { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    this.subscriptions.get(address)!.push(callback);
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(address: string): Promise<void> {
    if (!this.client) return;

    const callbacks = this.subscriptions.get(address);
    if (callbacks) {
      // Unsubscribe from topic
      await new Promise<void>((resolve) => {
        this.client!.unsubscribe(address, () => resolve());
      });

      this.subscriptions.delete(address);
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

  onError(callback: (error: Error) => void): void {
    if (this.client) {
      this.client.on('error', callback);
    }
  }

  /**
   * Handle incoming MQTT message
   */
  private handleMessage(topic: string, payload: Buffer): void {
    const value = this.bufferToValue(payload);
    const timestamp = new Date();

    // Cache the value
    this.cachedValues.set(topic, { value, timestamp });

    // Notify all subscribers
    const callbacks = this.subscriptions.get(topic);
    if (callbacks) {
      const event = {
        deviceId: this.config?.deviceId || 'unknown',
        address: topic,
        value,
        timestamp,
        quality: 'good' as const,
      };

      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (err) {
          console.error(`Error in subscription callback for ${topic}:`, err);
        }
      }
    }
  }

  /**
   * Convert Buffer to DeviceValue
   */
  private bufferToValue(payload: Buffer): DeviceValue {
    // Try to parse as JSON first
    const str = payload.toString();
    try {
      return JSON.parse(str);
    } catch {
      // Not JSON, return as string or buffer
      return str;
    }
  }

  /**
   * Convert DeviceValue to Buffer
   */
  private valueToBuffer(value: DeviceValue): Buffer {
    if (Buffer.isBuffer(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return Buffer.from(value);
    }
    return Buffer.from(JSON.stringify(value));
  }
}

// Export factory function
export function createMqttAdapter(): ProtocolAdapter {
  return new MqttAdapter();
}
