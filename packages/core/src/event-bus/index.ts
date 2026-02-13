/**
 * High-performance event bus for low-latency data propagation
 * Uses EventEmitter for async event handling with minimal overhead
 */

import { EventEmitter } from 'events';
import type { DataChangeEvent, DataCallback } from '../adapter/types.js';

export type EventType =
  | 'data'
  | 'error'
  | 'status'
  | 'connect'
  | 'disconnect'
  | 'reconnect';

export interface EventPayload {
  type: EventType;
  deviceId: string;
  data: unknown;
  timestamp: Date;
}

/**
 * High-performance event bus for device data
 * Optimized for low-latency data propagation
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private eventCount: number = 0;
  private startTime: number;

  private constructor() {
    super();
    // Increase max listeners for high-throughput scenarios
    this.setMaxListeners(100);
    this.startTime = Date.now();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emit data change event
   * Optimized for minimal latency
   */
  emitData(event: DataChangeEvent): boolean {
    this.eventCount++;
    // Use setImmediate for non-blocking emission in high-throughput scenarios
    return this.emit(`data:${event.deviceId}:${event.address}`, event) ||
           this.emit(`data:${event.deviceId}`, event) ||
           this.emit('data', event);
  }

  /**
   * Subscribe to data changes for a specific device
   */
  onData(deviceId: string, callback: DataCallback): void {
    this.on(`data:${deviceId}`, callback);
  }

  /**
   * Subscribe to data changes for a specific device address
   */
  onDataAddress(deviceId: string, address: string, callback: DataCallback): void {
    this.on(`data:${deviceId}:${address}`, callback);
  }

  /**
   * Subscribe to all data changes
   */
  onAllData(callback: DataCallback): void {
    this.on('data', callback);
  }

  /**
   * Unsubscribe from data changes
   */
  offData(deviceId: string, callback: DataCallback): void {
    this.off(`data:${deviceId}`, callback);
  }

  /**
   * Emit error event
   */
  emitError(deviceId: string, error: Error): boolean {
    return this.emit('error', { deviceId, error, timestamp: new Date() });
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (deviceId: string, error: Error) => void): void {
    this.on('error', callback);
  }

  /**
   * Emit status change event
   */
  emitStatus(deviceId: string, status: string): boolean {
    return this.emit('status', { deviceId, status, timestamp: new Date() });
  }

  /**
   * Subscribe to status changes
   */
  onStatus(callback: (deviceId: string, status: string) => void): void {
    this.on('status', callback);
  }

  /**
   * Get event statistics
   */
  getStats(): { eventCount: number; uptimeMs: number; eventsPerSecond: number } {
    const uptimeMs = Date.now() - this.startTime;
    return {
      eventCount: this.eventCount,
      uptimeMs,
      eventsPerSecond: uptimeMs > 0 ? (this.eventCount / (uptimeMs / 1000)) : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.eventCount = 0;
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();
