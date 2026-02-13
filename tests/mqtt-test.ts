/**
 * Quick Test Script for MQTT Adapter
 * Tests connection to public MQTT broker
 */

import mqtt from 'mqtt';

// Public MQTT broker for testing
const BROKER = 'mqtt://test.mosquitto.org:1883';
const TEST_TOPIC = 'auto-industry/test/hello';

console.log('Connecting to public MQTT broker...');
console.log(`Broker: ${BROKER}`);
console.log(`Topic: ${TEST_TOPIC}\n`);

const client = mqtt.connect(BROKER);

client.on('connect', () => {
  console.log('✓ Connected successfully!\n');

  // Subscribe to test topic
  client.subscribe(TEST_TOPIC, (err) => {
    if (err) {
      console.error('Failed to subscribe:', err);
      return;
    }
    console.log(`✓ Subscribed to: ${TEST_TOPIC}\n`);

    // Publish a test message
    const message = JSON.stringify({
      message: 'Hello from Auto Industry Gateway!',
      timestamp: new Date().toISOString(),
      value: Math.random() * 100
    });

    client.publish(TEST_TOPIC, message, (err) => {
      if (err) {
        console.error('Failed to publish:', err);
      } else {
        console.log('✓ Published test message:');
        console.log(`  ${message}\n`);
      }
    });
  });
});

client.on('message', (topic, payload) => {
  console.log('✓ Received message:');
  console.log(`  Topic: ${topic}`);
  console.log(`  Payload: ${payload.toString()}\n`);

  // Clean disconnect after receiving
  setTimeout(() => {
    client.end();
    console.log('Test completed successfully!');
    process.exit(0);
  }, 1000);
});

client.on('error', (err) => {
  console.error('Connection error:', err);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('Test timeout');
  client.end();
  process.exit(1);
}, 10000);
