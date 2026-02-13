# Adapter Development Guide

## Creating a New Protocol Adapter

This guide explains how to create a new protocol adapter for the Auto Industry Gateway.

## Step 1: Create Package Structure

```bash
mkdir -p packages/adapters/your-protocol/src
```

## Step 2: Package Configuration

Create `package.json`:

```json
{
  "name": "@auto-industry/your-protocol-adapter",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@auto-industry/core": "workspace:*",
    "your-protocol-library": "^1.0.0"
  }
}
```

## Step 3: Implement ProtocolAdapter Interface

Create `src/your-adapter.ts`:

```typescript
import type {
  ProtocolAdapter,
  DeviceConfig,
  DeviceStatus,
  DeviceValue,
  DataCallback,
} from '@auto-industry/core';

export class YourProtocolAdapter implements ProtocolAdapter {
  readonly protocol = 'your-protocol' as const;
  readonly name = 'Your Protocol Adapter';
  readonly version = '0.1.0';

  private config: YourConfig | null = null;
  private connectionStatus: DeviceStatus['status'] = 'disconnected';

  async connect(config: DeviceConfig): Promise<void> {
    this.config = config as YourConfig;
    this.connectionStatus = 'connecting';

    // Implement connection logic
    try {
      // Connect to device...
      this.connectionStatus = 'connected';
    } catch (error) {
      this.connectionStatus = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Cleanup resources
    this.connectionStatus = 'disconnected';
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  async read(address: string): Promise<DeviceValue> {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }
    // Implement read logic
    return value;
  }

  async write(address: string, value: DeviceValue): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }
    // Implement write logic
  }

  async subscribe(address: string, callback: DataCallback): Promise<void> {
    // Implement subscription logic
  }

  async unsubscribe(address: string): Promise<void> {
    // Implement unsubscription logic
  }

  getDeviceStatus(): DeviceStatus {
    return {
      deviceId: this.config?.deviceId || 'unknown',
      protocol: this.protocol,
      status: this.connectionStatus,
    };
  }
}

export function createYourProtocolAdapter(): ProtocolAdapter {
  return new YourProtocolAdapter();
}
```

## Step 4: Configuration Schema

Add configuration schema to `packages/gateway/src/config/schema.ts`:

```typescript
export const YourProtocolConfigSchema = BaseDeviceConfigSchema.extend({
  protocol: z.literal('your-protocol'),
  host: z.string(),
  port: z.number().default(1234),
  // Add protocol-specific options
});
```

## Step 5: Register Adapter

In the CLI or gateway startup:

```typescript
import { deviceManager } from '@auto-industry/core';
import { createYourProtocolAdapter } from '@auto-industry/your-protocol-adapter';

deviceManager.registerProtocol('your-protocol', createYourProtocolAdapter);
```

## Best Practices

### Error Handling
- Always check connection status before operations
- Provide meaningful error messages
- Implement automatic reconnection

### Performance
- Use connection pooling for TCP connections
- Batch multiple reads when possible
- Cache frequently accessed data

### Testing
- Test with real devices or simulators
- Test edge cases (timeouts, disconnections)
- Verify data type conversions

## Address Format Examples

| Protocol | Format | Example |
|----------|--------|---------|
| Modbus | `TYPE:ADDRESS[:QUANTITY]` | `holding:100`, `coil:0:8` |
| OPC UA | Node ID | `ns=2;s=MyVariable` |
| MQTT | Topic | `sensors/temperature/1` |
| S7 | Area specification | `DB1,X0.0`, `DB1,W100` |
