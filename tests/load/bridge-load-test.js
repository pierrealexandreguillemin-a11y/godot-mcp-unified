/**
 * Bridge Load Test
 * QG-P4-001: 100 commands/sec for 10 seconds
 * Expected: < 1% error rate, p99 < 500ms
 *
 * ISO/IEC 29119 compliant - Performance testing
 *
 * Usage:
 *   node tests/load/bridge-load-test.js
 *
 * Requirements:
 *   - Godot Editor running with MCP plugin enabled on ws://localhost:6505
 */

const WebSocket = require('ws');

// Configuration
const CONFIG = {
  url: 'ws://localhost:6505',
  commandsPerSecond: 100,
  durationSeconds: 10,
  timeout: 5000, // 5s timeout per request
};

// Metrics
const metrics = {
  sent: 0,
  success: 0,
  errors: 0,
  timeouts: 0,
  latencies: [],
  startTime: null,
  endTime: null,
};

// Generate unique request ID
let requestCounter = 0;
function generateId() {
  return `load-test-${Date.now()}-${++requestCounter}`;
}

// Create echo command
function createEchoCommand() {
  return {
    id: generateId(),
    action: 'echo',
    params: { timestamp: Date.now(), counter: requestCounter },
  };
}

// Track pending requests
const pendingRequests = new Map();

// Process response
function processResponse(data) {
  try {
    const response = JSON.parse(data);

    // Skip events (no id)
    if (!response.id) return;

    const pending = pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingRequests.delete(response.id);

      const latency = Date.now() - pending.startTime;
      metrics.latencies.push(latency);

      if (response.success) {
        metrics.success++;
      } else {
        metrics.errors++;
        console.error(`Error response: ${response.error?.message}`);
      }
    }
  } catch (err) {
    metrics.errors++;
    console.error(`Failed to parse response: ${err.message}`);
  }
}

// Calculate percentile
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Print results
function printResults() {
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const errorRate = (metrics.errors + metrics.timeouts) / metrics.sent * 100;
  const p50 = percentile(metrics.latencies, 50);
  const p95 = percentile(metrics.latencies, 95);
  const p99 = percentile(metrics.latencies, 99);
  const avgLatency = metrics.latencies.length > 0
    ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length
    : 0;

  console.log('\n========================================');
  console.log('        LOAD TEST RESULTS');
  console.log('========================================');
  console.log(`Duration:        ${duration.toFixed(2)}s`);
  console.log(`Commands sent:   ${metrics.sent}`);
  console.log(`Successful:      ${metrics.success}`);
  console.log(`Errors:          ${metrics.errors}`);
  console.log(`Timeouts:        ${metrics.timeouts}`);
  console.log(`Error rate:      ${errorRate.toFixed(2)}%`);
  console.log('----------------------------------------');
  console.log(`Avg latency:     ${avgLatency.toFixed(2)}ms`);
  console.log(`p50 latency:     ${p50}ms`);
  console.log(`p95 latency:     ${p95}ms`);
  console.log(`p99 latency:     ${p99}ms`);
  console.log('----------------------------------------');
  console.log(`Throughput:      ${(metrics.success / duration).toFixed(2)} cmd/s`);
  console.log('========================================');

  // QG-P4-001 validation
  const qgPassed = errorRate < 1 && p99 < 500;
  console.log('\nQG-P4-001 VALIDATION:');
  console.log(`  Error rate < 1%:  ${errorRate < 1 ? 'PASS' : 'FAIL'} (${errorRate.toFixed(2)}%)`);
  console.log(`  p99 < 500ms:      ${p99 < 500 ? 'PASS' : 'FAIL'} (${p99}ms)`);
  console.log(`  Overall:          ${qgPassed ? 'PASS' : 'FAIL'}`);
  console.log('========================================\n');

  return qgPassed;
}

// Main test
async function runLoadTest() {
  console.log('========================================');
  console.log('     GODOT BRIDGE LOAD TEST');
  console.log('========================================');
  console.log(`Target: ${CONFIG.url}`);
  console.log(`Rate: ${CONFIG.commandsPerSecond} cmd/s`);
  console.log(`Duration: ${CONFIG.durationSeconds}s`);
  console.log(`Expected: ${CONFIG.commandsPerSecond * CONFIG.durationSeconds} total commands`);
  console.log('========================================\n');

  return new Promise((resolve, reject) => {
    console.log('Connecting to Godot plugin...');

    const ws = new WebSocket(CONFIG.url);
    let intervalId = null;
    let isRunning = false;

    ws.on('open', () => {
      console.log('Connected! Starting load test...\n');
      metrics.startTime = Date.now();
      isRunning = true;

      // Send commands at configured rate
      const intervalMs = 1000 / CONFIG.commandsPerSecond;
      intervalId = setInterval(() => {
        if (!isRunning) return;

        const cmd = createEchoCommand();
        const startTime = Date.now();

        // Set timeout for this request
        const timeoutId = setTimeout(() => {
          if (pendingRequests.has(cmd.id)) {
            pendingRequests.delete(cmd.id);
            metrics.timeouts++;
          }
        }, CONFIG.timeout);

        pendingRequests.set(cmd.id, { startTime, timeout: timeoutId });

        try {
          ws.send(JSON.stringify(cmd));
          metrics.sent++;

          // Progress indicator
          if (metrics.sent % 100 === 0) {
            const elapsed = (Date.now() - metrics.startTime) / 1000;
            process.stdout.write(`\rSent: ${metrics.sent} | Success: ${metrics.success} | Errors: ${metrics.errors} | Elapsed: ${elapsed.toFixed(1)}s`);
          }
        } catch (err) {
          metrics.errors++;
        }
      }, intervalMs);

      // Stop after duration
      setTimeout(() => {
        isRunning = false;
        clearInterval(intervalId);

        // Wait for remaining responses
        console.log('\n\nWaiting for remaining responses...');
        setTimeout(() => {
          metrics.endTime = Date.now();

          // Count remaining as timeouts
          for (const [id, pending] of pendingRequests) {
            clearTimeout(pending.timeout);
            metrics.timeouts++;
          }
          pendingRequests.clear();

          ws.close();
          const passed = printResults();
          resolve(passed);
        }, 2000);
      }, CONFIG.durationSeconds * 1000);
    });

    ws.on('message', (data) => {
      processResponse(data.toString());
    });

    ws.on('error', (err) => {
      console.error(`\nWebSocket error: ${err.message}`);
      if (!isRunning) {
        reject(new Error(`Connection failed: ${err.message}`));
      }
    });

    ws.on('close', () => {
      if (isRunning) {
        console.log('\nConnection closed unexpectedly');
        isRunning = false;
        if (intervalId) clearInterval(intervalId);
      }
    });

    // Connection timeout
    setTimeout(() => {
      if (!isRunning && ws.readyState !== WebSocket.OPEN) {
        ws.terminate();
        reject(new Error('Connection timeout - is Godot running with MCP plugin?'));
      }
    }, 5000);
  });
}

// Run
runLoadTest()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((err) => {
    console.error(`\nLoad test failed: ${err.message}`);
    console.log('\nMake sure:');
    console.log('  1. Godot Editor is running');
    console.log('  2. MCP plugin is enabled in Project Settings > Plugins');
    console.log('  3. Plugin is listening on ws://localhost:6505');
    process.exit(1);
  });
