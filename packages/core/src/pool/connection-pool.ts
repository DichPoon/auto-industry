/**
 * Connection Pool
 * Reusable connection pool for TCP/UDP connections
 * Optimized for low-latency industrial communication
 */

import { EventEmitter } from 'events';

export interface PoolOptions {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
}

export interface PoolConnection<T> {
  id: string;
  connection: T;
  inUse: boolean;
  lastUsed: Date;
  createdAt: Date;
}

const DEFAULT_POOL_OPTIONS: PoolOptions = {
  maxConnections: 10,
  minConnections: 1,
  acquireTimeoutMs: 5000,
  idleTimeoutMs: 30000,
};

/**
 * Generic connection pool for managing connections
 */
export class ConnectionPool<T> extends EventEmitter {
  private pool: Map<string, PoolConnection<T>> = new Map();
  private waitQueue: Array<{
    resolve: (conn: PoolConnection<T>) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private options: PoolOptions;
  private connectionFactory: () => Promise<T>;
  private connectionValidator: (conn: T) => Promise<boolean>;
  private connectionDestroyer: (conn: T) => Promise<void>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    connectionFactory: () => Promise<T>,
    connectionValidator: (conn: T) => Promise<boolean>,
    connectionDestroyer: (conn: T) => Promise<void>,
    options?: Partial<PoolOptions>
  ) {
    super();
    this.connectionFactory = connectionFactory;
    this.connectionValidator = connectionValidator;
    this.connectionDestroyer = connectionDestroyer;
    this.options = { ...DEFAULT_POOL_OPTIONS, ...options };
  }

  /**
   * Initialize the pool with minimum connections
   */
  async initialize(): Promise<void> {
    const promises: Promise<PoolConnection<T>>[] = [];
    for (let i = 0; i < this.options.minConnections; i++) {
      promises.push(this.createConnection());
    }
    await Promise.all(promises);

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PoolConnection<T>> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const connection = await this.connectionFactory();

    const poolConn: PoolConnection<T> = {
      id,
      connection,
      inUse: false,
      lastUsed: new Date(),
      createdAt: new Date(),
    };

    this.pool.set(id, poolConn);
    this.emit('connection:created', poolConn);

    return poolConn;
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<PoolConnection<T>> {
    // Try to find an available connection
    for (const [, poolConn] of this.pool) {
      if (!poolConn.inUse) {
        // Validate connection
        try {
          const isValid = await this.connectionValidator(poolConn.connection);
          if (isValid) {
            poolConn.inUse = true;
            poolConn.lastUsed = new Date();
            return poolConn;
          }
        } catch {
          // Connection invalid, remove it
          this.pool.delete(poolConn.id);
        }
      }
    }

    // Create new connection if under max limit
    if (this.pool.size < this.options.maxConnections) {
      const poolConn = await this.createConnection();
      poolConn.inUse = true;
      return poolConn;
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitQueue.findIndex((w) => w.resolve === resolve);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
          reject(new Error('Connection acquire timeout'));
        }
      }, this.options.acquireTimeoutMs);

      this.waitQueue.push({ resolve, reject, timeout });
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(poolConn: PoolConnection<T>): void {
    poolConn.inUse = false;
    poolConn.lastUsed = new Date();

    // Check wait queue
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift();
      if (waiter) {
        clearTimeout(waiter.timeout);
        poolConn.inUse = true;
        waiter.resolve(poolConn);
      }
    }

    this.emit('connection:released', poolConn);
  }

  /**
   * Destroy a connection
   */
  async destroy(poolConn: PoolConnection<T>): Promise<void> {
    await this.connectionDestroyer(poolConn.connection);
    this.pool.delete(poolConn.id);
    this.emit('connection:destroyed', poolConn);
  }

  /**
   * Cleanup idle connections
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const idleThreshold = this.options.idleTimeoutMs;

    for (const [, poolConn] of this.pool) {
      if (
        !poolConn.inUse &&
        this.pool.size > this.options.minConnections &&
        now - poolConn.lastUsed.getTime() > idleThreshold
      ) {
        await this.destroy(poolConn);
      }
    }
  }

  /**
   * Shutdown the pool
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Reject all waiting requests
    for (const waiter of this.waitQueue) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Pool shutdown'));
    }
    this.waitQueue = [];

    // Destroy all connections
    for (const [, poolConn] of this.pool) {
      await this.destroy(poolConn);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    inUse: number;
    available: number;
    waiting: number;
  } {
    let inUse = 0;
    for (const [, conn] of this.pool) {
      if (conn.inUse) inUse++;
    }

    return {
      total: this.pool.size,
      inUse,
      available: this.pool.size - inUse,
      waiting: this.waitQueue.length,
    };
  }
}
