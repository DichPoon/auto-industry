/**
 * MCP Tools
 * Exposes industrial device operations as MCP tools
 */

import type { DeviceManager, DeviceValue, ProtocolType } from '@auto-industry/core';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool definitions
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'device_connect',
    description: 'Connect to an industrial device',
    inputSchema: {
      type: 'object' as const,
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
    description: 'Disconnect from an industrial device',
    inputSchema: {
      type: 'object' as const,
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
    description: 'Read a value from a device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID',
        },
        address: {
          type: 'string',
          description: 'The address to read from (protocol-specific format)',
        },
      },
      required: ['deviceId', 'address'],
    },
  },
  {
    name: 'device_write',
    description: 'Write a value to a device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID',
        },
        address: {
          type: 'string',
          description: 'The address to write to (protocol-specific format)',
        },
        value: {
          description: 'The value to write (number, string, boolean, or object)',
        },
      },
      required: ['deviceId', 'address', 'value'],
    },
  },
  {
    name: 'device_subscribe',
    description: 'Subscribe to data changes from a device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID',
        },
        address: {
          type: 'string',
          description: 'The address to subscribe to (protocol-specific format)',
        },
      },
      required: ['deviceId', 'address'],
    },
  },
  {
    name: 'device_unsubscribe',
    description: 'Unsubscribe from data changes',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID',
        },
        address: {
          type: 'string',
          description: 'The address to unsubscribe from',
        },
      },
      required: ['deviceId', 'address'],
    },
  },
  {
    name: 'device_list',
    description: 'List all configured devices and their status',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'device_discover',
    description: 'Discover devices on the network for a specific protocol',
    inputSchema: {
      type: 'object' as const,
      properties: {
        protocol: {
          type: 'string',
          enum: ['modbus', 'opcua', 'mqtt', 's7'],
          description: 'The protocol to discover devices for',
        },
      },
      required: ['protocol'],
    },
  },
  {
    name: 'device_browse',
    description: 'Browse the address space of a device (for protocols like OPC UA)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'The device ID',
        },
        path: {
          type: 'string',
          description: 'The path to browse (optional)',
        },
      },
      required: ['deviceId'],
    },
  },
];

/**
 * Tool handler for MCP server
 */
export class ToolHandler {
  private subscriptions: Map<string, Set<string>> = new Map();

  constructor(private deviceManager: DeviceManager) {}

  /**
   * Handle tool call
   */
  async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'device_connect':
          return await this.handleConnect(args.deviceId as string);

        case 'device_disconnect':
          return await this.handleDisconnect(args.deviceId as string);

        case 'device_read':
          return await this.handleRead(
            args.deviceId as string,
            args.address as string
          );

        case 'device_write':
          return await this.handleWrite(
            args.deviceId as string,
            args.address as string,
            args.value as DeviceValue
          );

        case 'device_subscribe':
          return await this.handleSubscribe(
            args.deviceId as string,
            args.address as string
          );

        case 'device_unsubscribe':
          return await this.handleUnsubscribe(
            args.deviceId as string,
            args.address as string
          );

        case 'device_list':
          return await this.handleList();

        case 'device_discover':
          return await this.handleDiscover(args.protocol as ProtocolType);

        case 'device_browse':
          return await this.handleBrowse(
            args.deviceId as string,
            args.path as string | undefined
          );

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }

  private async handleConnect(deviceId: string): Promise<CallToolResult> {
    await this.deviceManager.connectDevice(deviceId);
    return {
      content: [{ type: 'text', text: `Connected to device: ${deviceId}` }],
    };
  }

  private async handleDisconnect(deviceId: string): Promise<CallToolResult> {
    await this.deviceManager.disconnectDevice(deviceId);
    return {
      content: [{ type: 'text', text: `Disconnected from device: ${deviceId}` }],
    };
  }

  private async handleRead(deviceId: string, address: string): Promise<CallToolResult> {
    const value = await this.deviceManager.read(deviceId, address);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          deviceId,
          address,
          value,
          timestamp: new Date().toISOString(),
        }, null, 2),
      }],
    };
  }

  private async handleWrite(
    deviceId: string,
    address: string,
    value: DeviceValue
  ): Promise<CallToolResult> {
    await this.deviceManager.write(deviceId, address, value);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          deviceId,
          address,
          writtenValue: value,
          success: true,
          timestamp: new Date().toISOString(),
        }, null, 2),
      }],
    };
  }

  private async handleSubscribe(deviceId: string, address: string): Promise<CallToolResult> {
    await this.deviceManager.subscribe(deviceId, address, (event) => {
      // In a real implementation, this would send notifications to the MCP client
      console.log(`[Subscribe] ${deviceId}/${address}:`, event);
    });

    // Track subscription
    if (!this.subscriptions.has(deviceId)) {
      this.subscriptions.set(deviceId, new Set());
    }
    this.subscriptions.get(deviceId)!.add(address);

    return {
      content: [{
        type: 'text',
        text: `Subscribed to ${deviceId}/${address}. Data changes will be logged.`,
      }],
    };
  }

  private async handleUnsubscribe(deviceId: string, address: string): Promise<CallToolResult> {
    await this.deviceManager.unsubscribe(deviceId, address);

    // Remove from tracking
    const deviceSubs = this.subscriptions.get(deviceId);
    if (deviceSubs) {
      deviceSubs.delete(address);
    }

    return {
      content: [{ type: 'text', text: `Unsubscribed from ${deviceId}/${address}` }],
    };
  }

  private async handleList(): Promise<CallToolResult> {
    const statuses = this.deviceManager.getAllDeviceStatuses();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(statuses, null, 2),
      }],
    };
  }

  private async handleDiscover(protocol: ProtocolType): Promise<CallToolResult> {
    try {
      const devices = await this.deviceManager.discover(protocol);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            protocol,
            discoveredDevices: devices,
            timestamp: new Date().toISOString(),
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Discovery failed: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  private async handleBrowse(deviceId: string, path?: string): Promise<CallToolResult> {
    const adapter = this.deviceManager.getAdapter(deviceId);
    if (!adapter) {
      return {
        content: [{ type: 'text', text: `Device not found: ${deviceId}` }],
        isError: true,
      };
    }

    if (!adapter.browse) {
      return {
        content: [{ type: 'text', text: `Browse not supported for this device/protocol` }],
        isError: true,
      };
    }

    const results = await adapter.browse(path);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          deviceId,
          path: path || '/',
          items: results,
        }, null, 2),
      }],
    };
  }
}
