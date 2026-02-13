/**
 * Simple MQTT Test Script
 * Tests connection to public MQTT broker
 */

import { MqttAdapter } from '../packages/adapters/mqtt/src/index.js';

async function testMqtt() {
  console.log('=== MQTT Adapter Test ===\n');

  const adapter = new MqttAdapter();

  // Test configuration - using public MQTT broker
  const config = {
    deviceId: 'mqtt-test',
    protocol: 'mqtt' as const,
    broker: 'mqtt://test.mosquitto.org',
    port: 1883,
    enabled: true,
    timeout: 10000,
  };

  console.log('Connecting to:', config.broker);

  try {
    // Connect
    await adapter.connect(config);
    console.log('✓ Connected successfully!\n');

    // Subscribe to a test topic
    const testTopic = 'auto-industry/test/hello';
    console.log(`Subscribing to: ${testTopic}`);
    await adapter.subscribe(testTopic, (event) => {
      console.log('Received:', JSON.stringify(event, null, 2));
    });
    console.log('✓ Subscribed\n');

    // Publish a message
    const message = JSON.stringify({
      message: 'Hello from Auto Industry Gateway!',
      timestamp: new Date().toISOString(),
      value: Math.random() * 100
    });

    console.log(`Publishing to: ${testTopic}`);
    console.log('Message:', message);
    await adapter.write(testTopic, message);
    console.log('✓ Published\n');

    // Wait a bit to receive the message
    console.log('Waiting for message...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get device status
    const status = adapter.getDeviceStatus();
    console.log('Device Status:');
    console.log(JSON.stringify(status, null, 2));

    // Disconnect
    await adapter.disconnect();
    console.log('\n✓ Disconnected');

    console.log('\n=== Test Completed Successfully ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testMqtt();
