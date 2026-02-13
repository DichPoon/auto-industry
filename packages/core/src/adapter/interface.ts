/**
 * Protocol Adapter Interface
 * All protocol adapters must implement this interface
 */

import type {
  DeviceConfig,
  DeviceInfo,
  DeviceStatus,
  DeviceValue,
  DataCallback,
  ReadOptions,
  WriteOptions,
  SubscribeOptions,
  ProtocolType,
} from './types.js';

/**
 * Protocol Adapter Interface
 * Unified abstraction for all industrial protocols
 */
export interface ProtocolAdapter {
  // Metadata
  readonly protocol: ProtocolType;
  readonly name: string;
  readonly version: string;

  // Lifecycle methods
  /**
   * Connect to the device
   * @param config Device configuration
   */
  connect(config: DeviceConfig): Promise<void>;

  /**
   * Disconnect from the device
   */
  disconnect(): Promise<void>;

  /**
   * Check if the adapter is connected
   */
  isConnected(): boolean;

  // Data operations
  /**
   * Read a value from the device
   * @param address Device address (protocol-specific format)
   * @param options Read options
   */
  read(address: string, options?: ReadOptions): Promise<DeviceValue>;

  /**
   * Read multiple values from the device
   * @param addresses Array of device addresses
   * @param options Read options
   */
  readMany?(addresses: string[], options?: ReadOptions): Promise<Map<string, DeviceValue>>;

  /**
   * Write a value to the device
   * @param address Device address (protocol-specific format)
   * @param value Value to write
   * @param options Write options
   */
  write(address: string, value: DeviceValue, options?: WriteOptions): Promise<void>;

  /**
   * Write multiple values to the device
   * @param values Map of address -> value pairs
   * @param options Write options
   */
  writeMany?(values: Map<string, DeviceValue>, options?: WriteOptions): Promise<void>;

  // Subscription methods
  /**
   * Subscribe to data changes
   * @param address Device address to subscribe
   * @param callback Callback function for data changes
   * @param options Subscription options
   */
  subscribe(address: string, callback: DataCallback, options?: SubscribeOptions): Promise<void>;

  /**
   * Subscribe to multiple addresses
   * @param addresses Array of addresses to subscribe
   * @param callback Callback function for data changes
   * @param options Subscription options
   */
  subscribeMany?(
    addresses: string[],
    callback: DataCallback,
    options?: SubscribeOptions
  ): Promise<void>;

  /**
   * Unsubscribe from data changes
   * @param address Device address to unsubscribe
   */
  unsubscribe(address: string): Promise<void>;

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll?(): Promise<void>;

  // Device discovery and status
  /**
   * Discover available devices on the network
   * Optional: Not all protocols support discovery
   */
  discover?(): Promise<DeviceInfo[]>;

  /**
   * Get current device status
   */
  getDeviceStatus(): DeviceStatus;

  /**
   * Get device information
   */
  getDeviceInfo?(): Promise<DeviceInfo>;

  /**
   * Browse device address space
   * Optional: For protocols with hierarchical address space (OPC UA)
   */
  browse?(path?: string): Promise<BrowseResult[]>;

  // Error handling
  /**
   * Set error callback
   */
  onError?(callback: (error: Error) => void): void;
}

/**
 * Browse result for hierarchical address spaces
 */
export interface BrowseResult {
  name: string;
  address: string;
  dataType?: string;
  access?: 'read' | 'write' | 'readwrite';
  hasChildren?: boolean;
  description?: string;
}

/**
 * Protocol adapter constructor type
 */
export type ProtocolAdapterConstructor = new () => ProtocolAdapter;

/**
 * Protocol adapter factory function type
 */
export type ProtocolAdapterFactory = () => ProtocolAdapter;
