/**
 * OPC UA Protocol Adapter
 * Full OPC UA client implementation
 */

import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  TimestampsToReturn,
} from 'node-opcua';
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

/**
 * OPC UA Configuration
 */
interface OpcuaConfig extends DeviceConfig {
  endpoint: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: string;
  username?: string;
  password?: string;
}

/**
 * OPC UA Adapter
 * Implements ProtocolAdapter for OPC UA
 */
export class OpcuaAdapter implements ProtocolAdapter {
  readonly protocol: ProtocolType = 'opcua';
  readonly name = 'OPC UA Adapter';
  readonly version = '0.1.0';

  private client: any = null;
  private session: any = null;
  private subscription: any = null;
  private config: OpcuaConfig | null = null;
  private subscriptions: Map<string, any> = new Map();
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
    this.config = config as OpcuaConfig;

    try {
      this.connectionStatus = 'connecting';

      // Map security mode
      let securityMode: MessageSecurityMode;
      switch (this.config.securityMode) {
        case 'Sign':
          securityMode = MessageSecurityMode.Sign;
          break;
        case 'SignAndEncrypt':
          securityMode = MessageSecurityMode.SignAndEncrypt;
          break;
        default:
          securityMode = MessageSecurityMode.None;
      }

      // Map security policy
      let securityPolicy: SecurityPolicy;
      switch (this.config.securityPolicy) {
        case 'Basic128Rsa15':
          securityPolicy = SecurityPolicy.Basic128Rsa15;
          break;
        case 'Basic256':
          securityPolicy = SecurityPolicy.Basic256;
          break;
        case 'Basic256Sha256':
          securityPolicy = SecurityPolicy.Basic256Sha256;
          break;
        default:
          securityPolicy = SecurityPolicy.None;
      }

      // Create OPC UA client
      this.client = OPCUAClient.create({
        endpointMustExist: false,
        connectionStrategy: {
          maxRetry: 3,
          initialDelay: 1000,
          maxDelay: 10000,
        },
        securityMode,
        securityPolicy,
      });

      // Connect to server
      await this.client.connect(this.config.endpoint);

      // Create session
      if (this.config.username && this.config.password) {
        this.session = await this.client.createSession({
          type: 1, // UserName
          userName: this.config.username,
          password: this.config.password,
        });
      } else {
        this.session = await this.client.createSession();
      }

      // Create subscription for monitored items
      this.subscription = await this.session.createSubscription2({
        requestedPublishingInterval: 100,
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 10,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10,
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
    // Terminate subscription
    if (this.subscription) {
      await this.subscription.terminate();
      this.subscription = null;
    }

    // Close session
    if (this.session) {
      await this.session.close();
      this.session = null;
    }

    // Disconnect client
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }

    this.subscriptions.clear();
    this.connectionStatus = 'disconnected';
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.session !== null;
  }

  async read(address: string, _options?: ReadOptions): Promise<DeviceValue> {
    if (!this.isConnected() || !this.session) {
      throw new Error('Not connected to device');
    }

    const startTime = Date.now();

    try {
      const dataValue = await this.session.read({
        nodeId: address,
        attributeId: AttributeIds.Value,
      });

      // Update metrics
      this.metrics.readCount++;
      this.metrics.lastLatency = Date.now() - startTime;
      this.metrics.totalLatency += this.metrics.lastLatency;

      if (dataValue.statusCode.isGood()) {
        return dataValue.value?.value;
      } else {
        throw new Error(`Read failed with status: ${dataValue.statusCode.toString()}`);
      }
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async write(address: string, value: DeviceValue, _options?: WriteOptions): Promise<void> {
    if (!this.isConnected() || !this.session) {
      throw new Error('Not connected to device');
    }

    const startTime = Date.now();

    try {
      const statusCode = await this.session.write({
        nodeId: address,
        attributeId: AttributeIds.Value,
        value: {
          value: value,
        },
      });

      // Update metrics
      this.metrics.writeCount++;
      this.metrics.lastLatency = Date.now() - startTime;
      this.metrics.totalLatency += this.metrics.lastLatency;

      if (!statusCode.isGood()) {
        throw new Error(`Write failed with status: ${statusCode.toString()}`);
      }
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async subscribe(address: string, callback: DataCallback, options?: SubscribeOptions): Promise<void> {
    if (!this.isConnected() || !this.subscription) {
      throw new Error('Not connected to device');
    }

    const monitoredItem = await this.subscription.monitor(
      {
        nodeId: address,
        attributeId: AttributeIds.Value,
      },
      {
        samplingInterval: options?.interval || 100,
        discardOldest: true,
        queueSize: options?.queueSize || 10,
      },
      TimestampsToReturn.Both
    );

    monitoredItem.on('changed', (dataValue: any) => {
      callback({
        deviceId: this.config?.deviceId || 'unknown',
        address,
        value: dataValue.value?.value,
        timestamp: dataValue.sourceTimestamp || new Date(),
        quality: dataValue.statusCode.isGood() ? 'good' : 'bad',
      });
    });

    this.subscriptions.set(address, monitoredItem);
  }

  async unsubscribe(address: string): Promise<void> {
    const monitoredItem = this.subscriptions.get(address);
    if (monitoredItem) {
      await monitoredItem.terminate();
      this.subscriptions.delete(address);
    }
  }

  async browse(_path?: string): Promise<BrowseResult[]> {
    if (!this.isConnected() || !this.session) {
      throw new Error('Not connected to device');
    }

    const browseResult = await this.session.browse(_path || 'ObjectsFolder');

    return browseResult.references?.map((ref: any) => ({
      name: ref.browseName?.name?.toString() || '',
      address: ref.nodeId?.toString() || '',
      hasChildren: ref.nodeClass === 1,
    })) || [];
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
      this.client.on('connection_lost', callback);
      this.client.on('backoff', () => callback(new Error('Connection backoff')));
    }
  }
}

// Export factory function
export function createOpcuaAdapter(): ProtocolAdapter {
  return new OpcuaAdapter();
}
