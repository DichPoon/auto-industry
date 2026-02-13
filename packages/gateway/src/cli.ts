#!/usr/bin/env node
/**
 * CLI entry point for Auto Industry Gateway
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import pino from 'pino';
import yaml from 'yaml';
import { deviceManager } from '@auto-industry/core';
import { createGateway, GatewayConfigSchema, type GatewayConfig } from './index.js';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

/**
 * Load configuration from file
 */
function loadConfig(configPath: string): GatewayConfig {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, 'utf-8');

  // Parse YAML or JSON
  let config: unknown;
  if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
    config = yaml.parse(content);
  } else {
    config = JSON.parse(content);
  }

  // Validate configuration
  const validated = GatewayConfigSchema.parse(config);
  return validated;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const configPath = args[0] || process.env.AUTO_INDUSTRY_CONFIG || './configs/gateway.yaml';

  logger.info(`Loading configuration from: ${configPath}`);

  try {
    // Load configuration
    const config = loadConfig(resolve(configPath));

    // Create gateway
    const gateway = createGateway(deviceManager, config, {
      logLevel: config.logLevel,
    });

    // Handle shutdown signals
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await gateway.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await gateway.stop();
      process.exit(0);
    });

    // Start gateway
    await gateway.start();
  } catch (error) {
    logger.error(error, 'Failed to start gateway');
    process.exit(1);
  }
}

main();
