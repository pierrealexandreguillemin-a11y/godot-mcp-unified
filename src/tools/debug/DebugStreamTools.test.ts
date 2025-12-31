/**
 * Debug Stream Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleStartDebugStream } from './StartDebugStreamTool';
import { handleStopDebugStream } from './StopDebugStreamTool';
import { handleGetDebugStreamStatus } from './GetDebugStreamStatusTool';
import { debugStreamServer } from '../../debug/DebugStreamServer';

describe('Debug Stream Tools', () => {
  let testPort = 29990;

  afterEach(() => {
    // Ensure server is stopped after each test
    try {
      const status = debugStreamServer.getStatus();
      if (status.running) {
        debugStreamServer.stop();
      }
    } catch {
      // Ignore errors during cleanup
    }
    testPort++;
  });

  describe('StartDebugStream', () => {
    it('should start server on specified port', async () => {
      const result = await handleStartDebugStream({ port: testPort });

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.port).toBe(testPort);
      expect(content.url).toBe(`ws://localhost:${testPort}`);
    });

    it('should return error if server already running', async () => {
      // Start first server
      await handleStartDebugStream({ port: testPort });

      // Try to start second server
      const result = await handleStartDebugStream({ port: testPort + 1 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('already running');
    });

    it('should return error for invalid port', async () => {
      const result = await handleStartDebugStream({ port: 99999 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid port');
    });

    it('should return error for port below 1', async () => {
      const result = await handleStartDebugStream({ port: 0 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid port');
    });

    it('should return error for invalid poll interval', async () => {
      const result = await handleStartDebugStream({ port: testPort, pollIntervalMs: 5 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid poll interval');
    });

    it('should return error for poll interval too high', async () => {
      const result = await handleStartDebugStream({ port: testPort, pollIntervalMs: 20000 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid poll interval');
    });

    it('should accept custom poll interval', async () => {
      const result = await handleStartDebugStream({ port: testPort, pollIntervalMs: 500 });

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.port).toBe(testPort);
    });
  });

  describe('StopDebugStream', () => {
    it('should stop a running server', async () => {
      // Start server first
      await handleStartDebugStream({ port: testPort });

      // Stop server
      const result = await handleStopDebugStream({});

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.message).toContain('stopped');
    });

    it('should return error if server not running', async () => {
      const result = await handleStopDebugStream({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not running');
    });

    it('should report disconnected client count', async () => {
      // Start server first
      await handleStartDebugStream({ port: testPort });

      // Stop server (no clients connected)
      const result = await handleStopDebugStream({});

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.disconnectedClients).toBe(0);
    });
  });

  describe('GetDebugStreamStatus', () => {
    it('should return not running status when server stopped', async () => {
      const result = await handleGetDebugStreamStatus({});

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.running).toBe(false);
      expect(content.url).toBeUndefined();
    });

    it('should return running status with URL', async () => {
      // Start server first
      await handleStartDebugStream({ port: testPort });

      const result = await handleGetDebugStreamStatus({});

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.running).toBe(true);
      expect(content.port).toBe(testPort);
      expect(content.url).toBe(`ws://localhost:${testPort}`);
      expect(content.clientCount).toBe(0);
    });

    it('should track client count as zero when no clients', async () => {
      await handleStartDebugStream({ port: testPort });

      const result = await handleGetDebugStreamStatus({});

      const content = JSON.parse(result.content[0].text);
      expect(content.clientCount).toBe(0);
    });
  });
});
