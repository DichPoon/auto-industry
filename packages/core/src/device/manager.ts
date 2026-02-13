/**
 * Device Manager
 * Manages device connections and protocol adapters
 */

import type {
  ProtocolAdapter,
  ProtocolAdapterFactory,
  DeviceConfig,
  DeviceInfo,
  DeviceStatus,
  DeviceValue,
  DataCallback,
  ProtocolType,
} from '../adapter/index.js';
import { eventBus } from '../event-bus/index.js';

/**
 * Device Manager
 * Central registry for all devices and their adapters
 */
export class DeviceManager {
  private adapters: Map<string, ProtocolAdapter> = new Map();
  private factories: Map<ProtocolType, ProtocolAdapterFactory> = new Map();
  private configs: Map<string, DeviceConfig> = new Map();

  /**
   * Register a protocol adapter factory
   */
  registerProtocol(protocol: ProtocolType, factory: ProtocolAdapterFactory): void {
    this.factories.set(protocol, factory);
  }

  /**
   * Add a device configuration
   */
  addDeviceConfig(config: DeviceConfig): void {
    if (!config.deviceId) {
      throw new Error('Device ID is required');
    }
    this.configs.set(config.deviceId, config);
  }

  /**
   * Add multiple device configurations
   */
  addDeviceConfigs(configs: DeviceConfig[]): void {
    for (const config of configs) {
      this.addDeviceConfig(config);
    }
  }

  /**
   * Connect to a device
   */
  async connectDevice(deviceId: string): Promise<ProtocolAdapter> {
    const config = this.configs.get(deviceId);
    if (!config) {
      throw new Error(`Device configuration not found: ${deviceId}`);
    }

    // Check if already connected
    const existing = this.adapters.get(deviceId);
    if (existing && existing.isConnected()) {
      return existing;
    }

    // Get factory for protocol
    const factory = this.factories.get(config.protocol);
    if (!factory) {
      throw new Error(`Protocol not registered: ${config.protocol}`);
    }

    // Create and connect adapter
    const adapter = factory();
    await adapter.connect(config);

    // Set up error handling
    adapter.onError?.((error) => {
      eventBus.emitError(deviceId, error);
    });

    // Store adapter
    this.adapters.set(deviceId, adapter);
    eventBus.emitStatus(deviceId, 'connected');

    return adapter;
  }

  /**
   * Disconnect from a device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(deviceId);
      eventBus.emitStatus(deviceId, 'disconnected');
    }
  }

  /**
   * Connect to all configured devices
   */
  async connectAll(): Promise<Map<string, Error | null>> {
    const results = new Map<string, Error | null>();

    for (const [deviceId] of this.configs) {
      try {
        await this.connectDevice(deviceId);
        results.set(deviceId, null);
      } catch (error) {
        results.set(deviceId, error as Error);
      }
    }

    return results;
  }

  /**
   * Disconnect from all devices
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.adapters.keys()).map((deviceId) =>
      this.disconnectDevice(deviceId)
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Get adapter for a device
   */
  getAdapter(deviceId: string): ProtocolAdapter | undefined {
    return this.adapters.get(deviceId);
  }

  /**
   * Get all connected devices
   */
  getConnectedDevices(): string[] {
    return Array.from(this.adapters.entries())
      .filter(([_, adapter]) => adapter.isConnected())
      .map(([deviceId]) => deviceId);
  }

  /**
   * Get device status
   */
  getDeviceStatus(deviceId: string): DeviceStatus | undefined {
    const adapter = this.adapters.get(deviceId);
    return adapter?.getDeviceStatus();
  }

  /**
   * Get all device statuses
   */
  getAllDeviceStatuses(): DeviceStatus[] {
    return Array.from(this.adapters.values()).map((adapter) => adapter.getDeviceStatus());
  }

  /**
   * Read from a device
   */
  async read(deviceId: string, address: string): Promise<DeviceValue> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      throw new Error(`Device not connected: ${deviceId}`);
    }
    return adapter.read(address);
  }

  /**
   * Write to a device
   */
  async write(deviceId: string, address: string, value: DeviceValue): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      throw new Error(`Device not connected: ${deviceId}`);
    }
    return adapter.write(address, value);
  }

  /**
   * Subscribe to device data changes
   */
  async subscribe(
    deviceId: string,
    address: string,
    callback: DataCallback
  ): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      throw new Error(`Device not connected: ${deviceId}`);
    }
    return adapter.subscribe(address, callback);
  }

  /**
   * Unsubscribe from device data changes
   */
  async unsubscribe(deviceId: string, address: string): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      throw new Error(`Device not connected: ${deviceId}`);
    }
    return adapter.unsubscribe(address);
  }

  /**
   * Discover devices for a protocol
   */
  async discover(protocol: ProtocolType): Promise<DeviceInfo[]> {
    const factory = this.factories.get(protocol);
    if (!factory) {
      throw new Error(`Protocol not registered: ${protocol}`);
    }

    const adapter = factory();
    if (!adapter.discover) {
      throw new Error(`Discovery not supported for protocol: ${protocol}`);
    }

    return adapter.discover();
  }

  /**
   * Check if a device is connected
   */
  isConnected(deviceId: string): boolean {
    const adapter = this.adapters.get(deviceId);
    return adapter?.isConnected() ?? false;
  }

  /**
   * Get registered protocols
   */
  getRegisteredProtocols(): ProtocolType[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Remove device configuration
   */
  removeDeviceConfig(deviceId: string): void {
    this.configs.delete(deviceId);
  }
}

// Export singleton instance
export const deviceManager = new DeviceManager();
