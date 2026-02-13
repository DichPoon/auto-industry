# Deployment Guide

## Edge Device Deployment

### System Requirements

- Node.js 20 LTS or later
- 512MB RAM minimum (1GB recommended)
- Network connectivity to industrial devices

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/auto-industry.git
   cd auto-industry
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the project:
   ```bash
   ppm build
   ```

4. Create configuration:
   ```bash
   pnpm cli init
   ```

### Running the Gateway

Development mode:
```bash
pnpm gateway
```

Production mode (with PM2):
```bash
pm2 start "pnpm gateway" --name auto-industry-gateway
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/*/
COPY packages/adapters/*/package.json ./packages/adapters/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build
RUN pnpm build

# Configuration
COPY configs/gateway.yaml /app/configs/

# Expose port (if needed for health checks)
EXPOSE 3000

CMD ["pnpm", "gateway"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  auto-industry-gateway:
    build: .
    restart: unless-stopped
    volumes:
      - ./configs:/app/configs:ro
    environment:
      - NODE_ENV=production
      - AUTO_INDUSTRY_CONFIG=/app/configs/gateway.yaml
```

## Configuration Management

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTO_INDUSTRY_CONFIG` | Path to config file | `./configs/gateway.yaml` |
| `LOG_LEVEL` | Log level | `info` |
| `NODE_ENV` | Environment | `development` |

### Security Considerations

1. **Credential Storage**
   - Use environment variables for sensitive data
   - Consider using a secrets manager

2. **Network Security**
   - Use TLS/SSL for OPC UA connections
   - Implement network segmentation

3. **Access Control**
   - Restrict access to the gateway
   - Use authentication for device connections

## Monitoring

### Health Check

The gateway exposes device status through MCP tools:

```bash
# List device statuses
auto-industry list
```

### Logs

Logs are written to stdout in JSON format:

```bash
# View logs
pm2 logs auto-industry-gateway
```

### Metrics

Device metrics are available through:
- MCP `device_list` tool
- Device status resources

## Troubleshooting

### Connection Issues

1. Check network connectivity:
   ```bash
   ping 192.168.1.100
   telnet 192.168.1.100 502
   ```

2. Verify configuration:
   ```bash
   auto-industry list
   ```

3. Check logs for errors:
   ```bash
   pm2 logs auto-industry-gateway --lines 100
   ```

### Performance Issues

1. Reduce polling intervals in subscriptions
2. Enable connection pooling
3. Use batch read operations
4. Check device latency metrics
