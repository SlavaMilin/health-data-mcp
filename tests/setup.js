/**
 * Global test setup - starts server before all tests
 */
import { spawn } from 'child_process';
import { beforeAll, afterAll } from 'vitest';

let serverProcess = null;

beforeAll(async () => {
  console.log('\n🚀 Starting server for integration tests...\n');

  // Start server in background
  serverProcess = spawn('pnpm', ['exec', 'tsx', 'bin/server.ts'], {
    env: {
      ...process.env,
      AUTH_TOKEN: 'test-token-123',
      GITHUB_CLIENT_ID: 'test-client-id',
      GITHUB_CLIENT_SECRET: 'test-client-secret',
      GITHUB_API_URL: 'http://127.0.0.1:3333',
      BASE_URL: 'http://127.0.0.1:3000',
      PORT: '3000',
      HOST: '127.0.0.1',
    },
    stdio: 'pipe',
  });

  let serverReady = false;

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // Only show important logs
    if (output.includes('Server listening') || output.includes('migrations')) {
      console.log('   Server:', output.trim());
    }
    // Detect when server is ready
    if (output.includes('Server listening')) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('   Server Error:', data.toString());
  });

  // Wait for server to be ready
  const maxRetries = 40;
  const retryDelay = 500;

  console.log('   Waiting for server to start...');

  for (let i = 0; i < maxRetries; i++) {
    // Wait for server ready flag first
    if (!serverReady) {
      if (i % 5 === 0 && i > 0) {
        console.log(`   Still waiting for "Server listening" message... (${i * retryDelay}ms)`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      continue;
    }

    // Server says it's ready, now try to connect
    try {
      const response = await fetch('http://127.0.0.1:3000/health');
      if (response.ok) {
        console.log('✅ Server ready for tests\n');
        return;
      } else {
        console.log(`   Server responded with status ${response.status}`);
      }
    } catch (error) {
      // Server not ready yet, wait
      if (i % 3 === 0) {
        console.log(`   Waiting for server to respond... (attempt ${i + 1}/${maxRetries}): ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Server failed to respond to health check within timeout');
}, 20000); // 20s timeout for server startup

afterAll(async () => {
  if (serverProcess) {
    console.log('\n🛑 Stopping server...');
    serverProcess.kill('SIGTERM');

    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Server stopped\n');
  }
});
