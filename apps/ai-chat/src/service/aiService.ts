import Anthropic from '@anthropic-ai/sdk';
import type { DeviceInfo } from '../types';

// Tool definitions for the AI
const tools: Anthropic.Tool[] = [
  {
    name: 'device_list',
    description: 'List all configured devices and their status',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'device_connect',
    description: 'Connect to a specific device',
    input_schema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID to connect to',
        },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'device_disconnect',
    description: 'Disconnect from a specific device',
    input_schema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID to disconnect from',
        },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'device_read',
    description: 'Read data from a device (sensor values, registers, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID to read from',
        },
        address: {
          type: 'string',
          description: 'The address to read (e.g., "sensor/temperature", "HR100")',
        },
      },
      required: ['deviceId', 'address'],
    },
  },
  {
    name: 'device_write',
    description: 'Write data to a device (set values, control outputs)',
    input_schema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID to write to',
        },
        address: {
          type: 'string',
          description: 'The address to write to',
        },
        value: {
          type: ['string', 'number', 'boolean'],
          description: 'The value to write',
        },
      },
      required: ['deviceId', 'address', 'value'],
    },
  },
  {
    name: 'device_subscribe',
    description: 'Subscribe to data updates from a device',
    input_schema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID to subscribe to',
        },
        address: {
          type: 'string',
          description: 'The address pattern to subscribe to',
        },
      },
      required: ['deviceId', 'address'],
    },
  },
];

export interface ToolResult {
  toolUseId: string;
  content: string;
}

// Mock device operations (in real implementation, these would call the MCP gateway)
class DeviceManager {
  private devices: Map<string, DeviceInfo>;
  private sensorData: Map<string, Map<string, { value: number | string | boolean; unit?: string }>>;

  constructor(devices: DeviceInfo[]) {
    this.devices = new Map(devices.map(d => [d.id, d]));
    this.sensorData = new Map();

    // Initialize mock sensor data
    this.sensorData.set('mqtt-local', new Map([
      ['sensor/temperature', { value: 25.5 + Math.random() * 2, unit: '°C' }],
      ['sensor/humidity', { value: 60 + Math.random() * 10, unit: '%' }],
      ['sensor/pressure', { value: 1013.25 + Math.random() * 5, unit: 'hPa' }],
      ['plc/status', { value: 'running' }],
    ]));

    this.sensorData.set('modbus-sim', new Map([
      ['HR100', { value: 1500 + Math.floor(Math.random() * 100), unit: 'RPM' }],
      ['HR101', { value: 75 + Math.floor(Math.random() * 10), unit: '%' }],
      ['HR102', { value: 42 }],
    ]));
  }

  updateDevices(devices: DeviceInfo[]) {
    this.devices = new Map(devices.map(d => [d.id, d]));
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    switch (name) {
      case 'device_list': {
        const deviceList = Array.from(this.devices.values());
        return JSON.stringify({
          success: true,
          devices: deviceList.map(d => ({
            id: d.id,
            name: d.name,
            protocol: d.protocol,
            status: d.status,
            enabled: d.enabled,
          })),
        }, null, 2);
      }

      case 'device_connect': {
        const deviceId = args.deviceId as string;
        const device = this.devices.get(deviceId);
        if (!device) {
          return JSON.stringify({ success: false, error: `Device ${deviceId} not found` });
        }

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update device status
        device.status = 'online';
        this.devices.set(deviceId, { ...device, status: 'online' });

        return JSON.stringify({
          success: true,
          message: `Connected to ${device.name}`,
          device: { id: device.id, name: device.name, status: 'online' },
        });
      }

      case 'device_disconnect': {
        const deviceId = args.deviceId as string;
        const device = this.devices.get(deviceId);
        if (!device) {
          return JSON.stringify({ success: false, error: `Device ${deviceId} not found` });
        }

        device.status = 'offline';
        this.devices.set(deviceId, { ...device, status: 'offline' });

        return JSON.stringify({
          success: true,
          message: `Disconnected from ${device.name}`,
        });
      }

      case 'device_read': {
        const deviceId = args.deviceId as string;
        const address = args.address as string;

        const device = this.devices.get(deviceId);
        if (!device) {
          return JSON.stringify({ success: false, error: `Device ${deviceId} not found` });
        }

        if (device.status !== 'online') {
          return JSON.stringify({
            success: false,
            error: `Device ${device.name} is not connected (status: ${device.status})`,
          });
        }

        const deviceData = this.sensorData.get(deviceId);
        if (!deviceData) {
          return JSON.stringify({ success: false, error: `No data available for device ${deviceId}` });
        }

        // Check for exact match or pattern match
        let result = deviceData.get(address);
        if (!result) {
          // Try to find matching keys
          const matches: string[] = [];
          for (const key of deviceData.keys()) {
            if (key.includes(address) || address.includes(key)) {
              matches.push(key);
            }
          }

          if (matches.length > 0) {
            const results = matches.map(key => ({
              address: key,
              ...deviceData.get(key),
            }));
            return JSON.stringify({
              success: true,
              device: device.name,
              data: results,
              timestamp: new Date().toISOString(),
            }, null, 2);
          }

          // Return all data if no specific address matched
          const allData = Array.from(deviceData.entries()).map(([addr, val]) => ({
            address: addr,
            ...val,
          }));

          return JSON.stringify({
            success: true,
            device: device.name,
            message: `Address "${address}" not found. Available data:`,
            data: allData,
            timestamp: new Date().toISOString(),
          }, null, 2);
        }

        return JSON.stringify({
          success: true,
          device: device.name,
          address,
          value: result.value,
          unit: result.unit,
          timestamp: new Date().toISOString(),
        }, null, 2);
      }

      case 'device_write': {
        const deviceId = args.deviceId as string;
        const address = args.address as string;
        const value = args.value;

        const device = this.devices.get(deviceId);
        if (!device) {
          return JSON.stringify({ success: false, error: `Device ${deviceId} not found` });
        }

        if (device.status !== 'online') {
          return JSON.stringify({
            success: false,
            error: `Device ${device.name} is not connected`,
          });
        }

        // Simulate write operation
        const deviceData = this.sensorData.get(deviceId);
        if (deviceData) {
          deviceData.set(address, { value: value as number | string | boolean });
        }

        return JSON.stringify({
          success: true,
          message: `Wrote ${JSON.stringify(value)} to ${address} on ${device.name}`,
          timestamp: new Date().toISOString(),
        });
      }

      case 'device_subscribe': {
        const deviceId = args.deviceId as string;
        const address = args.address as string;

        const device = this.devices.get(deviceId);
        if (!device) {
          return JSON.stringify({ success: false, error: `Device ${deviceId} not found` });
        }

        return JSON.stringify({
          success: true,
          message: `Subscribed to ${address} on ${device.name}. You will receive updates automatically.`,
          subscriptionId: `sub_${Date.now()}`,
        });
      }

      default:
        return JSON.stringify({ success: false, error: `Unknown tool: ${name}` });
    }
  }
}

export class AIService {
  private client: Anthropic | null = null;
  private deviceManager: DeviceManager;

  constructor(devices: DeviceInfo[]) {
    this.deviceManager = new DeviceManager(devices);
  }

  updateDevices(devices: DeviceInfo[]) {
    this.deviceManager.updateDevices(devices);
  }

  setApiKey(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // For demo purposes
    });
  }

  async *streamChat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string
  ): AsyncGenerator<{ type: 'text' | 'tool_use' | 'done'; content: string | { id: string; name: string; args: Record<string, unknown> } }> {
    if (!this.client) {
      // Fallback: Simulate AI response without API
      yield* this.simulateResponse(messages);
      return;
    }

    try {
      const stream = this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && 'text' in event.delta) {
          yield { type: 'text', content: event.delta.text };
        }
      }

      // Get final message to check for tool calls
      const finalMessage = await stream.finalMessage();

      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          yield {
            type: 'tool_use',
            content: {
              id: block.id,
              name: block.name,
              args: block.input as Record<string, unknown>,
            },
          };

          // Execute tool and continue conversation
          const result = await this.deviceManager.executeTool(block.name, block.input as Record<string, unknown>);

          yield { type: 'text', content: `\n\`\`\`json\n${result}\n\`\`\`\n` };
        }
      }

      yield { type: 'done', content: '' };
    } catch (error) {
      yield {
        type: 'text',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      };
      yield { type: 'done', content: '' };
    }
  }

  private async *simulateResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): AsyncGenerator<{ type: 'text' | 'tool_use' | 'done'; content: string | { id: string; name: string; args: Record<string, unknown> } }> {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';

    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simple pattern matching for demo
    if (lastMessage.includes('设备') || lastMessage.includes('device') || lastMessage.includes('列表') || lastMessage.includes('list')) {
      const result = await this.deviceManager.executeTool('device_list', {});
      yield { type: 'text', content: '让我查看一下当前的设备状态：\n\n' };
      yield { type: 'text', content: '```json\n' + result + '\n```\n' };
    }
    else if (lastMessage.includes('连接') || lastMessage.includes('connect')) {
      const deviceMatch = lastMessage.match(/mqtt|modbus|opcua|s7/);
      const deviceId = deviceMatch ? `${deviceMatch[0]}-local` : 'mqtt-local';

      yield { type: 'text', content: `正在连接设备 ${deviceId}...\n\n` };

      const result = await this.deviceManager.executeTool('device_connect', { deviceId });
      yield { type: 'text', content: '```json\n' + result + '\n```\n' };
    }
    else if (lastMessage.includes('读取') || lastMessage.includes('read') || lastMessage.includes('数据') || lastMessage.includes('data') || lastMessage.includes('温度') || lastMessage.includes('temperature')) {
      const result = await this.deviceManager.executeTool('device_read', {
        deviceId: 'mqtt-local',
        address: 'sensor/temperature',
      });
      yield { type: 'text', content: '读取到的传感器数据：\n\n' };
      yield { type: 'text', content: '```json\n' + result + '\n```\n' };
    }
    else if (lastMessage.includes('湿度') || lastMessage.includes('humidity')) {
      const result = await this.deviceManager.executeTool('device_read', {
        deviceId: 'mqtt-local',
        address: 'sensor/humidity',
      });
      yield { type: 'text', content: '读取到的湿度数据：\n\n' };
      yield { type: 'text', content: '```json\n' + result + '\n```\n' };
    }
    else if (lastMessage.includes('帮助') || lastMessage.includes('help') || lastMessage.includes('?') || lastMessage.includes('？')) {
      yield { type: 'text', content: `我可以帮助你完成以下操作：

📋 **设备管理**
- 查看设备列表和状态
- 连接/断开设备

📊 **数据读取**
- 读取温度数据
- 读取湿度数据
- 读取压力数据
- 查看所有传感器数据

⚙️ **设备控制**
- 写入数据到设备
- 订阅数据更新

试着说：
- "查看所有设备"
- "读取温度数据"
- "连接 Modbus 设备"
` };
    }
    else {
      yield { type: 'text', content: `我理解你想了解关于工业设备的信息。我可以帮助你：

1. 查看设备状态
2. 读取传感器数据
3. 控制设备

请告诉我你想做什么，或者输入"帮助"查看更多信息。` };
    }

    yield { type: 'done', content: '' };
  }
}

export const createAIService = (devices: DeviceInfo[]) => new AIService(devices);
