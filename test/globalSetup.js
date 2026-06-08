/**
 * Gas Town GUI - Global Test Setup
 *
 * Starts mock server before all tests and stops it after.
 *
 * Uses an ephemeral port by default to avoid conflicting with other local projects.
 */

import { startMockServer, stopMockServer } from './mock-server.js';
import { execFileSync } from 'child_process';

let server;

export async function setup() {
  console.log('[Test Setup] Building React frontend...');
  execFileSync('npm', ['--prefix', 'web', 'run', 'build'], {
    stdio: 'inherit',
  });

  console.log('[Test Setup] Starting mock server...');

  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 0;
  server = await startMockServer({ port: requestedPort });

  const actualPort = server?.address?.()?.port ?? requestedPort;
  process.env.PORT = String(actualPort);
  process.env.TEST_URL = `http://localhost:${actualPort}`;

  console.log(`[Test Setup] Mock server started on ${process.env.TEST_URL}`);
}

export async function teardown() {
  console.log('[Test Teardown] Stopping mock server...');
  await stopMockServer();
  console.log('[Test Teardown] Mock server stopped');
}
