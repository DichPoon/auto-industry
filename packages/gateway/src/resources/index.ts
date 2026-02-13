/**
 * MCP Resources
 * Exposes industrial devices as MCP resources
 */

import type { DeviceManager } from '@auto-industry/core';

/**
 * Resource URI format: device://{protocol}/{deviceId}/{path}
 * Examples:
 * - device://modbus/plc1/status
 * - device://modbus/plc1/read/HR:0
 * - device://opcua/server1/browse/Objects
 */

export interface DeviceResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Parse device resource URI
 */
export function parseResourceUri(uri: string): {
  protocol: string;
  deviceId: string;
  path: string;
} | null {
  const match = uri.match(/^device:\/\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!match) {
    return null;
  }
  return {
    protocol: match[1],
    deviceId: match[2],
    path: match[3],
  };
}

/**
 * Build resource URI
 */
export function buildResourceUri(
  protocol: string,
  deviceId: string,
  path: string
): string {
  return `device://${protocol}/${deviceId}/${path}`;
}

/**
 * Resource handler for MCP server
 */
export class ResourceHandler {
  constructor(private deviceManager: DeviceManager) {}

  /**
   * List all available resources
   */
  async listResources(): Promise<DeviceResource[]> {
    const resources: DeviceResource[] = [];
    const statuses = this.deviceManager.getAllDeviceStatuses();

    for (const status of statuses) {
      // Add device status resource
      resources.push({
        uri: buildResourceUri(status.protocol, status.deviceId, 'status'),
        name: `${status.deviceId} - Status`,
        description: `Connection status for device ${status.deviceId}`,
        mimeType: 'application/json',
      });

      // Add device info resource
      resources.push({
        uri: buildResourceUri(status.protocol, status.deviceId, 'info'),
        name: `${status.deviceId} - Info`,
        description: `Device information for ${status.deviceId}`,
        mimeType: 'application/json',
      });
    }

    return resources;
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
    const parsed = parseResourceUri(uri);
    if (!parsed) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    const { protocol, deviceId, path } = parsed;

    switch (path) {
      case 'status': {
        const status = this.deviceManager.getDeviceStatus(deviceId);
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2),
          }],
        };
      }

      case 'info': {
        const adapter = this.deviceManager.getAdapter(deviceId);
        const info = adapter?.getDeviceInfo ? await adapter.getDeviceInfo() : { deviceId, protocol };
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(info, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown resource path: ${path}`);
    }
  }
}
