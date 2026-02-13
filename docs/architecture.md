# Auto Industry Gateway - Architecture

## Overview

Auto Industry Gateway is an industrial protocol aggregation gateway that converts various industrial communication protocols to MCP (Model Context Protocol), enabling AI systems to interact with industrial devices seamlessly.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI / Claude Code                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ MCP Protocol
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Gateway Server                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Resources   │  │   Tools     │  │  Prompts    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Protocol Adapter Interface
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Protocol Adapters                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ Modbus  │ │ OPC UA  │ │  MQTT   │ │   S7    │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Industrial Protocols
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Industrial Devices                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │  PLCs   │ │ Sensors │ │ Robots  │ │  SCADA  │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Protocol Adapter Interface (`@auto-industry/core`)

The unified interface that all protocol adapters must implement:

```typescript
interface ProtocolAdapter {
  // Lifecycle
  connect(config: DeviceConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Data Operations
  read(address: string): Promise<DeviceValue>;
  write(address: string, value: DeviceValue): Promise<void>;

  // Subscriptions
  subscribe(address: string, callback: DataCallback): Promise<void>;
  unsubscribe(address: string): Promise<void>;

  // Device Info
  getDeviceStatus(): DeviceStatus;
}
```

### 2. MCP Gateway (`@auto-industry/gateway`)

Exposes industrial devices through MCP:

**Resources:**
- `device://{protocol}/{deviceId}/status` - Device connection status
- `device://{protocol}/{deviceId}/info` - Device information

**Tools:**
- `device_connect` - Connect to a device
- `device_disconnect` - Disconnect from a device
- `device_read` - Read a value from device
- `device_write` - Write a value to device
- `device_subscribe` - Subscribe to data changes
- `device_list` - List all configured devices
- `device_discover` - Discover devices on network
- `device_browse` - Browse device address space

### 3. Protocol Adapters

| Adapter | Protocol | Use Case |
|---------|----------|----------|
| `@auto-industry/modbus-adapter` | Modbus TCP/RTU | PLCs, sensors, general industrial devices |
| `@auto-industry/opcua-adapter` | OPC UA | Industrial 4.0, complex data models |
| `@auto-industry/mqtt-adapter` | MQTT | IoT, remote monitoring |
| `@auto-industry/s7-adapter` | Siemens S7 | Siemens PLCs (S7-200/300/400/1200/1500) |

## Low-Latency Design

To achieve millisecond-level latency:

1. **Connection Pooling** - Reuse TCP connections
2. **Event-Driven Architecture** - Non-blocking I/O
3. **Buffer Pooling** - Minimize memory allocation
4. **Batch Operations** - Reduce round-trips
5. **Local Caching** - Hot data caching

## Package Structure

```
packages/
├── core/              # Core interfaces and utilities
├── gateway/           # MCP server implementation
├── adapters/
│   ├── modbus/        # Modbus TCP/RTU
│   ├── opcua/         # OPC UA
│   ├── mqtt/          # MQTT
│   └── s7/            # Siemens S7
└── cli/               # Command-line tools
```

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build the project:
   ```bash
   pnpm build
   ```

3. Initialize configuration:
   ```bash
   pnpm cli init
   ```

4. Edit `configs/gateway.yaml` with your device settings

5. Start the gateway:
   ```bash
   pnpm gateway
   ```
