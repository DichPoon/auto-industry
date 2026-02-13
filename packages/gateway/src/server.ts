/**
 * MCP Gateway Server
 * Industrial Protocol to MCP Gateway
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { DeviceManager } from '@auto-industry/core';
import { ToolHandler } from './tools/index.js';
import type { GatewayConfig } from './config/index.js';
import { z } from 'zod';
import pino from 'pino';

export interface GatewayOptions {
  name?: string;
  version?: string;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
}

/**
 * MCP Gateway Server
 */
export class GatewayServer {
  private server: McpServer;
  private deviceManager: DeviceManager;
  private toolHandler: ToolHandler;
  private logger: pino.Logger;
  private config: GatewayConfig;

  constructor(
    deviceManager: DeviceManager,
    config: GatewayConfig,
    options?: GatewayOptions
  ) {
    this.deviceManager = deviceManager;
    this.config = config;

    // Initialize logger
    this.logger = pino({
      level: options?.logLevel || config.logLevel || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    });

    // Create MCP server
    this.server = new McpServer({
      name: options?.name || config.name || 'Auto Industry Gateway',
      version: options?.version || config.version || '0.1.0',
    });

    // Initialize handlers
    this.toolHandler = new ToolHandler(deviceManager);

    // Setup server handlers
    this.setupHandlers();
  }

  /**
   * Setup MCP server handlers
   */
  private setupHandlers(): void {
    // Register tools with Zod schemas
    this.server.tool(
      'device_connect',
      'Connect to an industrial device',
      {
        deviceId: z.string().describe('The device ID to connect to'),
      },
      async ({ deviceId }) => {
        return await this.toolHandler.handleToolCall('device_connect', { deviceId });
      }
    );

    this.server.tool(
      'device_disconnect',
      'Disconnect from an industrial device',
      {
        deviceId: z.string().describe('The device ID to disconnect from'),
      },
      async ({ deviceId }) => {
        return await this.toolHandler.handleToolCall('device_disconnect', { deviceId });
      }
    );

    this.server.tool(
      'device_read',
      'Read a value from a device',
      {
        deviceId: z.string().describe('The device ID'),
        address: z.string().describe('The address to read from'),
      },
      async ({ deviceId, address }) => {
        return await this.toolHandler.handleToolCall('device_read', { deviceId, address });
      }
    );

    this.server.tool(
      'device_write',
      'Write a value to a device',
      {
        deviceId: z.string().describe('The device ID'),
        address: z.string().describe('The address to write to'),
        value: z.any().describe('The value to write'),
      },
      async ({ deviceId, address, value }) => {
        return await this.toolHandler.handleToolCall('device_write', { deviceId, address, value });
      }
    );

    this.server.tool(
      'device_subscribe',
      'Subscribe to data changes from a device',
      {
        deviceId: z.string().describe('The device ID'),
        address: z.string().describe('The address to subscribe to'),
      },
      async ({ deviceId, address }) => {
        return await this.toolHandler.handleToolCall('device_subscribe', { deviceId, address });
      }
    );

    this.server.tool(
      'device_unsubscribe',
      'Unsubscribe from data changes',
      {
        deviceId: z.string().describe('The device ID'),
        address: z.string().describe('The address to unsubscribe from'),
      },
      async ({ deviceId, address }) => {
        return await this.toolHandler.handleToolCall('device_unsubscribe', { deviceId, address });
      }
    );

    this.server.tool(
      'device_list',
      'List all configured devices',
      {},
      async () => {
        return await this.toolHandler.handleToolCall('device_list', {});
      }
    );

    this.server.tool(
      'device_discover',
      'Discover devices on the network',
      {
        protocol: z.enum(['modbus', 'opcua', 'mqtt', 's7']).describe('The protocol to discover'),
      },
      async ({ protocol }) => {
        return await this.toolHandler.handleToolCall('device_discover', { protocol });
      }
    );

    this.logger.info('MCP handlers registered');
  }

  /**
   * Start the gateway server
   */
  async start(): Promise<void> {
    this.logger.info('Starting Auto Industry Gateway...');

    // Load device configurations
    await this.loadDevices();

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.info('Gateway started and listening on stdio');
  }

  /**
   * Load devices from configuration
   */
  private async loadDevices(): Promise<void> {
    for (const deviceConfig of this.config.devices) {
      if (deviceConfig.enabled !== false) {
        this.deviceManager.addDeviceConfig(deviceConfig as any);
        this.logger.info(`Loaded device configuration: ${deviceConfig.deviceId}`);
      }
    }
  }

  /**
   * Stop the gateway server
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping gateway...');

    // Disconnect all devices
    await this.deviceManager.disconnectAll();

    this.logger.info('Gateway stopped');
  }
}

/**
 * Create and configure a gateway server
 */
export function createGateway(
  deviceManager: DeviceManager,
  config: GatewayConfig,
  options?: GatewayOptions
): GatewayServer {
  return new GatewayServer(deviceManager, config, options);
}
