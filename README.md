# Auto Industry Gateway

**Industrial Protocol to MCP Gateway** - Connect AI to Industrial Devices

A high-performance gateway that converts industrial communication protocols (Modbus, OPC UA, MQTT, Siemens S7) to MCP (Model Context Protocol), enabling AI systems like Claude to interact seamlessly with industrial devices.

## Features

- **Multi-Protocol Support**: Modbus TCP/RTU, OPC UA, MQTT, Siemens S7
- **MCP Integration**: Full support for MCP Resources and Tools
- **Low Latency**: Optimized for millisecond-level response times
- **Edge Deployment**: Designed for industrial edge computing environments
- **Type-Safe**: Full TypeScript implementation with comprehensive type definitions

## Architecture

```
┌─────────────────┐
│   AI / Claude   │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│  MCP Gateway    │
│  (Resources &   │
│   Tools)        │
└────────┬────────┘
         │ Protocol Adapters
         ▼
┌─────────────────┐
│   Industrial    │
│    Devices      │
└─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20 LTS or later
- pnpm 9.x

### Installation

```bash
# Clone the repository
git clone https://github.com/DichPoon/auto-industry.git
cd auto-industry

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Configuration

```bash
# Initialize configuration file
pnpm cli init

# Edit the configuration
vim configs/gateway.yaml
```

### Running the Gateway

```bash
# Start the MCP gateway
pnpm gateway
```

## MCP Tools

The gateway exposes the following MCP tools:

| Tool | Description |
|------|-------------|
| `device_connect` | Connect to an industrial device |
| `device_disconnect` | Disconnect from a device |
| `device_read` | Read a value from a device address |
| `device_write` | Write a value to a device address |
| `device_subscribe` | Subscribe to data changes |
| `device_list` | List all configured devices |
| `device_discover` | Discover devices on the network |
| `device_browse` | Browse device address space |

## Protocol Adapters

### Modbus (TCP/RTU)

```yaml
devices:
  - deviceId: modbus-plc-1
    protocol: modbus
    host: 192.168.1.100
    port: 502
    unitId: 1
```

Address format: `TYPE:ADDRESS` (e.g., `holding:100`, `coil:0`)

### OPC UA

```yaml
devices:
  - deviceId: opcua-server-1
    protocol: opcua
    endpoint: opc.tcp://localhost:4840
    securityMode: None
```

Address format: Node ID (e.g., `ns=2;s=Temperature`)

### MQTT

```yaml
devices:
  - deviceId: mqtt-broker-1
    protocol: mqtt
    broker: mqtt://localhost
    port: 1883
```

Address format: Topic (e.g., `sensors/temperature/1`)

### Siemens S7

```yaml
devices:
  - deviceId: s7-plc-1
    protocol: s7
    host: 192.168.1.101
    rack: 0
    slot: 1
```

Address format: S7 notation (e.g., `DB1,X0.0`, `DB1,W100`)

## Project Structure

```
auto-industry/
├── packages/
│   ├── core/                  # Core interfaces and utilities
│   ├── gateway/               # MCP server implementation
│   ├── adapters/
│   │   ├── modbus/            # Modbus TCP/RTU adapter
│   │   ├── opcua/             # OPC UA adapter
│   │   ├── mqtt/              # MQTT adapter
│   │   └── s7/                # Siemens S7 adapter
│   └── cli/                   # Command-line tools
├── configs/                   # Configuration files
├── docs/                      # Documentation
└── examples/                  # Usage examples
```

## Documentation

- [Architecture](docs/architecture.md) - System architecture overview
- [Adapter Development](docs/adapter-development.md) - How to create new protocol adapters
- [Deployment](docs/deployment.md) - Production deployment guide

## Development

```bash
# Build all packages
pnpm build

# Watch mode for development
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint
```

## License

MIT
