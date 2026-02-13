#!/usr/bin/env node
/**
 * Auto Industry CLI
 * Command-line interface for the industrial protocol gateway
 */

import { Command } from 'commander';
import pino from 'pino';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'yaml';
import { deviceManager } from '@auto-industry/core';
import { createGateway, GatewayConfigSchema, type GatewayConfig } from '@auto-industry/gateway';
import { createModbusAdapter } from '@auto-industry/modbus-adapter';
import { createOpcuaAdapter } from '@auto-industry/opcua-adapter';
import { createMqttAdapter } from '@auto-industry/mqtt-adapter';
import { createS7Adapter } from '@auto-industry/s7-adapter';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const program = new Command();

program
  .name('auto-industry')
  .description('Industrial Protocol to MCP Gateway CLI')
  .version('0.1.0');

/**
 * Start command - Start the MCP gateway server
 */
program
  .command('start')
  .description('Start the MCP gateway server')
  .option('-c, --config <path>', 'Path to configuration file', './configs/gateway.yaml')
  .option('-l, --log-level <level>', 'Log level (trace|debug|info|warn|error)', 'info')
  .action(async (options) => {
    const configPath = resolve(options.config);

    if (!existsSync(configPath)) {
      logger.error(`Configuration file not found: ${configPath}`);
      logger.info('Run "auto-industry init" to create a sample configuration');
      process.exit(1);
    }

    logger.info(`Loading configuration from: ${configPath}`);

    try {
      // Load configuration
      const content = readFileSync(configPath, 'utf-8');
      let config: GatewayConfig;

      if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        config = GatewayConfigSchema.parse(yaml.parse(content));
      } else {
        config = GatewayConfigSchema.parse(JSON.parse(content));
      }

      // Register protocol adapters
      deviceManager.registerProtocol('modbus', createModbusAdapter);
      deviceManager.registerProtocol('opcua', createOpcuaAdapter);
      deviceManager.registerProtocol('mqtt', createMqttAdapter);
      deviceManager.registerProtocol('s7', createS7Adapter);

      logger.info('Registered protocols: modbus, opcua, mqtt, s7');

      // Create and start gateway
      const gateway = createGateway(deviceManager, config, {
        logLevel: options.logLevel,
      });

      // Handle shutdown signals
      process.on('SIGINT', async () => {
        logger.info('Shutting down...');
        await gateway.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        logger.info('Shutting down...');
        await gateway.stop();
        process.exit(0);
      });

      await gateway.start();
    } catch (error) {
      logger.error(error, 'Failed to start gateway');
      process.exit(1);
    }
  });

/**
 * Init command - Initialize a new configuration
 */
program
  .command('init')
  .description('Initialize a new configuration file')
  .option('-o, --output <path>', 'Output path for configuration file', './configs/gateway.yaml')
  .option('-f, --format <format>', 'Output format (yaml|json)', 'yaml')
  .action(async (options) => {
    const outputPath = resolve(options.output);

    if (existsSync(outputPath)) {
      logger.error(`Configuration file already exists: ${outputPath}`);
      process.exit(1);
    }

    const sampleConfig: GatewayConfig = {
      name: 'Auto Industry Gateway',
      version: '0.1.0',
      logLevel: 'info',
      devices: [
        {
          deviceId: 'modbus-plc-1',
          protocol: 'modbus',
          name: 'Modbus TCP PLC',
          enabled: true,
          timeout: 5000,
          host: '192.168.1.100',
          port: 502,
          unitId: 1,
        } as any,
        {
          deviceId: 'mqtt-broker-1',
          protocol: 'mqtt',
          name: 'MQTT Broker',
          enabled: false,
          broker: 'mqtt://localhost',
          port: 1883,
        } as any,
        {
          deviceId: 's7-plc-1',
          protocol: 's7',
          name: 'Siemens S7 PLC',
          enabled: false,
          host: '192.168.1.101',
          port: 102,
          rack: 0,
          slot: 1,
        } as any,
      ],
    };

    let content: string;
    if (options.format === 'json') {
      content = JSON.stringify(sampleConfig, null, 2);
    } else {
      content = yaml.stringify(sampleConfig);
    }

    writeFileSync(outputPath, content, 'utf-8');
    logger.info(`Created configuration file: ${outputPath}`);
    logger.info('Edit the configuration file and run "auto-industry start" to start the gateway');
  });

/**
 * List command - List configured devices
 */
program
  .command('list')
  .description('List configured devices')
  .option('-c, --config <path>', 'Path to configuration file', './configs/gateway.yaml')
  .action(async (options) => {
    const configPath = resolve(options.config);

    if (!existsSync(configPath)) {
      logger.error(`Configuration file not found: ${configPath}`);
      process.exit(1);
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      let config: GatewayConfig;

      if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        config = GatewayConfigSchema.parse(yaml.parse(content));
      } else {
        config = GatewayConfigSchema.parse(JSON.parse(content));
      }

      console.log('\nConfigured Devices:');
      console.log('='.repeat(60));

      for (const device of config.devices) {
        const status = device.enabled ? '✓ enabled' : '✗ disabled';
        console.log(`\n[${device.protocol.toUpperCase()}] ${device.deviceId}`);
        console.log(`  Name: ${device.name || 'N/A'}`);
        console.log(`  Status: ${status}`);
      }

      console.log('\n');
    } catch (error) {
      logger.error(error, 'Failed to load configuration');
      process.exit(1);
    }
  });

/**
 * Discover command - Discover devices on the network
 */
program
  .command('discover <protocol>')
  .description('Discover devices on the network for a specific protocol')
  .action(async (protocol) => {
    logger.info(`Discovering ${protocol} devices...`);

    // Register protocol adapters
    deviceManager.registerProtocol('modbus', createModbusAdapter);
    deviceManager.registerProtocol('opcua', createOpcuaAdapter);
    deviceManager.registerProtocol('mqtt', createMqttAdapter);
    deviceManager.registerProtocol('s7', createS7Adapter);

    try {
      const devices = await deviceManager.discover(protocol as any);
      console.log('\nDiscovered Devices:');
      console.log('='.repeat(60));

      for (const device of devices) {
        console.log(`\n- ${device.deviceId}`);
        console.log(`  Protocol: ${device.protocol}`);
        console.log(`  Address: ${device.address}`);
        if (device.name) console.log(`  Name: ${device.name}`);
      }

      console.log('\n');
    } catch (error) {
      logger.error(error, `Discovery failed for protocol: ${protocol}`);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
